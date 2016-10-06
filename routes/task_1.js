var express = require('express');
var url = require("url");
var request = require('request');
var htmlparser = require("htmlparser2");

var router = express.Router();

/* GET home page. */
router.get('/I/want/title/', function(req, res, next) {
    var addresses = [];
    var ready_to_render = true;
    var addresses_params = req.query.address || [];
    
    var generate_params = function(){
        //  If url param is of string type convert the param to array else return the url params array.
        if (typeof addresses_params === 'string' || addresses_params instanceof String){
            return [addresses_params];
        }
        return addresses_params;
    }
    
    var generate_addresses_structure = function(){
        // Save the url information for addresess.
        var address;
        var address_info = {};
        var url_parsed ;
        for (var counter = 0; counter < addresses_params.length; counter++) {
            address = addresses_params[counter];
            url_parsed = url.parse(address);
            address_info['url'] = address;
            address_info['protocol'] = url_parsed.c;
            addresses.push(address_info);
            address_info = {};
        }
    }

    var is_title_tag = function(tag_name){
        // is the pass tag_name is title or not.
        if (tag_name === 'title'){
            return true;
        }else{
            return false;
        }
    }
    
    var parse_html = function(url_info, counter){
        // extract the title from html page and check if all titles fetching is complete or not.
        var tag_name;
        var parser = new htmlparser.Parser({
            onopentag: function(name, attribs){
                if(is_title_tag(name)){
                    tag_name = name;
                }
            },
            ontext: function(text){
                if(is_title_tag(tag_name)){
                    url_info['title'] = text;
                }
            },
            onclosetag: function(name){
               if(is_title_tag(name)){
                   tag_name = '';
                } 
            },
            onerror: function(error){
                if(is_title_tag(tag_name)){
                  url_info['title'] = 'Title Not Found';
                }   
            }
        }, {decodeEntities: true});
        
        // if there is error while fetching the page we dont need to parse it.
        if (url_info['status'] == 'pass'){
            parser.write(url_info['content']);
            parser.end();
        }
        addresses[counter] = url_info;
        titles_are_available();
    }
    
    var titles_are_available = function(){
        // when all titles fetching is complete then we are ready to render the titles.
        ready_to_render = true;
        for (var counter = 0; counter < addresses.length; counter++) {
            // if one of the url does not contains title its means it is still in progress.
            if (!('title' in addresses[counter])){
                ready_to_render = false;   
            }
        }
        if (ready_to_render){
            rend_render_titles();
        }
    }
    
    var make_url = function(url_info){
        // if protocol is not present then add default protocol else it will return the url.
        var url;
        if (url_info['protocol'] === null){
            url = 'http://' + url_info['url'];
        }else{
            url = url_info['url'];
        }
        return url;
    }
    
    var get_html = function(url_info, counter){
        // fetch the html-page using request library and then parse it.
        var url = make_url(url_info);
        request(url, function (error, response, body) {
            url_info['status'] = 'fail';
            //Check for error
            if(error){
                url_info['title'] = 'No Response/Ivalid-Url';
            }
            //Check for right status code
            else if(response.statusCode !== 200){
                url_info['title'] = 'Invalid Status Code :' + response.statusCode;
            }
            else{
                url_info['status'] = 'pass';
                url_info['content'] = body;
                url_info['title'] = 'Title Not Found'; // Initially no title of html.
            }
            addresses[counter] = url_info; // update the addresses array
            parse_html(url_info, counter);
        });
    }
    
    var rend_render_titles = function(){
        // render the index page.
        res.render('index', {'addresses': addresses});
    }
    
    var get_addresses_titles = function(){
        // fetch and parse the title of each address passed.
        if (addresses.length > 0){
            for (var counter = 0; counter < addresses.length; counter++) {
                get_html(addresses[counter], counter);
            }
        }else{
            rend_render_titles();
        }
    }

    // main
    addresses_params = generate_params();
    generate_addresses_structure();
    get_addresses_titles();
});

module.exports = router;