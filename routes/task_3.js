var express = require('express');
var url = require("url");
var request = require('request');
var htmlparser = require("htmlparser2");
var Q = require("q");

var router = express.Router();

/* GET home page. */
router.get('/I/want/title/', function(req, res, next) {
    
    var generate_params = function(){
        //  If url param is of string type convert the param to array else return the url params array.
        var addresses_params = req.query.address || [];
        if (typeof addresses_params === 'string' || addresses_params instanceof String){
            addresses_params = [addresses_params];
        }
        return addresses_params;
    }
    
    var is_title_tag = function(tag_name){
        // is the pass tag_name is title or not.
        if (tag_name === 'title'){
            return true;
        }else{
            return false;
        }
    }
    
    var make_url = function(url_info){
        // if protocol is not present then add default protocol else it will return the url.
        var url;
        if (url_info['url_protocol'] === null){
            url = 'http://' + url_info['url'];
        }else{
            url = url_info['url'];
        }
        return url;
    }
    
    function fetch_params(){
        //  fetch the params from url.
        var deferred = Q.defer();
        deferred.resolve(generate_params());
        return deferred.promise;
    }
    
    function generate_addresses_structure(addresses_params){
        // Save the url information for addresess.
        var deferred = Q.defer();
        var addresses = [];
        var address;
        var address_info = {};
        var url_parsed ;
        for (var counter = 0; counter < addresses_params.length; counter++) {
            address = addresses_params[counter];
            url_parsed = url.parse(address);
            address_info['url'] = address;
            address_info['url_protocol'] = url_parsed.protocol;
            addresses.push(address_info);
            address_info = {};
        }
        deferred.resolve(addresses);
        return deferred.promise;
    }
    
    var get_html = function(addresses){
        // fetch the html-page using request library and then parse it.
        var promises = [];
        addresses.forEach(function(url_info) {
            var url = make_url(url_info);
            var deferred = Q.defer();
            request(url, function(error, response, body) {
                deferred.resolve(body);
            });
            promises.push(deferred.promise);
        });
        return Q.all(promises);
    }
    
    function parse_responses(responses){
        // parse the request responses.
        var deferred = Q.defer();
        var addresses_params = generate_params();
        var addresses = [];
        var address_info = {};
        var current_response;
        for (var counter = 0; counter < responses.length; counter++) {
            current_response = responses[counter];
            if (current_response){
                address_info['status'] = 'pass';
                address_info['content'] = current_response;
                address_info['title'] = 'Title Not Found';
            }else{
                address_info['status'] = 'fail';
                address_info['title'] = 'No Response/Ivalid-Url';
            }
            address_info['url'] = addresses_params[counter];
            addresses.push(address_info);
            address_info = {};
        }
        deferred.resolve(addresses);
        return deferred.promise;
    }
    
    function parse_html(addresses){
        // extract the title from html page and check if all titles fetching is complete or not.
        var deferred = Q.defer();
        for (var counter = 0; counter < addresses.length; counter++) {
            var url_info = addresses[counter];
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
        }
        deferred.resolve(addresses);
        return deferred.promise;
    }
    
    function rend_render_titles(addresses){
        // render the index page.
        res.render('index', {'addresses': addresses});
    }
    
    // main using ** Q Module ** at https://github.com/kriskowal/q
    fetch_params().then(function(addresses){
        return generate_addresses_structure(addresses);
    }).then(function(addresses){
        return get_html(addresses);
    }).then(function(responses){
        return parse_responses(responses);
    }).then(function(addresses){
        return parse_html(addresses);
    }).then(function(addresses){
        rend_render_titles(addresses);
    });
});

module.exports = router;