//HTTPFunctions.js

//Include the http module
const http = require('http');

/**
 * Writes different responses depending on the `StatusCode` given. 
 * 
 * @param {http.ServerResponse} response `http.ServerResponse` Object sent from index file
 * @param {number} StatusCode Given code for the end of the operation
 */
module.exports.HTTPResponse = (response, StatusCode) => {
    switch(StatusCode){

        case 0:     //For successful execution of request and query
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write('Success! Data received!');
            response.end();
            return;

        case 1:     //If no "key" or if the "key" is wrong.
            response.writeHead(401, {'Content-Type': 'text/html'});
            response.write('Error 401: Unauthorised access logged. Please provide identification.');
            response.end();
            return;
        
        case 2:     //For successful request but unsuccessful query
            response.writeHead(400, {'Content-Type': 'text/html'});
            response.write('Error 400: Invalid values given or missing parameters. Check your syntax.');
            response.end();
            return;
        
        case 3:     //For unknown internal errors
            response.writeHead(500, {'Content-Type': 'text/html'});
            response.write(`Error 500: Unknown server error. Contact the administator with the timestamp ${new Date().toISOString()}`);
            response.end();
            return; 
    }
}