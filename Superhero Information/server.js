/*
	COMP 2406A (Winter 2017): Assignment #1 - Altin Rexhepaj (101000622)
	Sources: Professor's course notes (Dr. Andrew Runka)
*/

//simple server listens on the provided port and responds with requested pages
// load modules
var http = require('http');
var fs = require('fs');
var mime = require('mime-types');
var url = require('url');
const ROOT = "./public_html";

// create http server
var server = http.createServer(handleRequest);
/*
	----- R1.1)
*/
server.listen(2406);
console.log('Server listening on port 2406');

// handler for incoming requests
function handleRequest(req, res) {

    //process the request
    console.log("Request for: " + req.url);

    // parse the url
    var pathname = url.parse(req.url, true).pathname;
    var urlObj = url.parse(req.url, true);
    var filename = ROOT + urlObj.pathname;

    // parse the url query
    var split = req.url.split("?name=");
    var urlpart = split[0];
    var query = split[1];

    // response code (eg. 200 for OK 404 for Not Found,.etc.)
    var code;
    var data = "";

    /*
    	----- R1.2)
    */
    // server route if the directory is "/", then respond with index.html page
    if (urlpart === "/") {
        filename += "index.html";
        data = getFileContents(filename);
        code = 200;
    }
    /*
    	----- R1.3) & R3.1)
    */
    // server route if the directory is "/allHeroes", respond with list of
    // recipe filenames
    else if (urlpart === "/allHeroes") {
        // find the file in the directory and send it as a string
        data = JSON.stringify(fs.readdirSync(filename));
        code = 200;
    }
    /*
    	----- R1.4)
    */
    else if (urlpart === "/hero" && query !== undefined) {

        filename = (ROOT + "/allHeroes/" + query + ".json");

        if (fs.existsSync(filename)) {
            // if a GET request is made for a file
            if (req.method === "GET") {
                data = getFileContents(filename);
                code = 200;
            }
        } else {
            console.log("Error 404: File not found");
            code = 404;
            data = getFileContents(ROOT + "/404.html");
        }
    }
    // route if an existing file is requested
    else if (fs.existsSync(filename)) {
        // if a GET request is made for a file
        if (req.method === "GET") {
            data = getFileContents(filename);
            code = 200;
        }
    }
    // for all other cases, this must be an error, so return the 404 page
    else {
        console.log("Error 404: File not found");
        code = 404;
        data = getFileContents(ROOT + "/404.html");
    }

    // content header
    res.writeHead(code, {
        'content-type': mime.lookup(filename) || 'text/html'
    });
    // write message and signal communication is complete
    res.end(data);
};

// getting the file contents
function getFileContents(filename) {
    var contents = "";
    var stats = fs.statSync(filename);
    if (stats.isDirectory()) {
        contents = fs.readdirSync(filename).join("\n");
    } else {
        contents = fs.readFileSync(filename);
    }
    return contents;
}
