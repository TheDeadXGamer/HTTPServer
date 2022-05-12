//index.js

//Include necessary modules
const sql = require('mysql2');
const http = require('http');
const GTG = require('./HTTPFunctions.js')
const Joel = require('./Methods.js')
const Schedule = require('node-schedule')
const mailer = require('nodemailer');

/**
 * Use settings to create an SQL pool
 * 
 * ```js
 * const pool = sql.createPool({   
    "host": "ip of server hosting the db",
    "port": "port (Default is 3306)",
    "user": "user",
    "password": "password",
    "database": "dbname"
});
 * ```
 */
const pool = sql.createPool({
    "host": "localhost",
    "port": "3306",
    "user": "nodejs",
    "password": "kolja50",
    "database": "joelpeteket"
});

//Settings for mailing through nodejs
const transporter = mailer.createTransport({
    service: 'hotmail',
    auth: {
      user: 'joelpeteket@hotmail.com',
      pass: 'gtg2022!'
    }
  });

/**
 * Callback for `http.createServer(callback)`
 * ```js
 * getFunc(request, response){
 *  if (request.method == 'POST')
 *      //...
 * //Use parameters of getFunc inside
 * //Request, Response etc
 * }
 * ```
 * @param {http.IncomingMessage} request Object for handling the request sent by the client
 * @param {http.ServerResponse} response Object for sending "responses" to the client who made the request
 * 
 */
function getFunc(request, response) {

    //Check if the request method is a GET method. E.g if the request was sent via "browser link"
    if (request.method == 'GET') {

        //Create URL object by using the url sent from client
        const url = new URL(`http://localhost:8080${request.url}`);

        //When page has loaded
        request.on('readable', () => {

            //Fetch URL parameters
            var Urlparameters = url.searchParams; 

            //If no parameters are set
            if (!Urlparameters) return;

            //Check for unauthorised access. e.g Check if the 'key' is right.
            if (Urlparameters.get('key') != '987654321') {
                console.error('Error 401: Unauthorised access detected.');
                console.log(request.socket.remoteAddress);
                GTG.HTTPResponse(response, 1); //Send "illegal" response
                return;
            }

            //Get the "Method" parameter
            const Method = Urlparameters.get('Method');

            //Check what value the parameter has
            switch(Method){

                //The first request sent from the ESP
                case 'Initial':
                    Joel.Initial_Request(response, Urlparameters, pool);
                    return;
                
                //The main portion of the interaction
                case 'Main':
                    Joel.Check_Method(response, Urlparameters, pool);
                    return;

                //In case another method or no method is chosen
                default:
                    GTG.HTTPResponse(response, 2);
                    console.error('Client Error: Chosen method is not known.')
                    return;
            }
        });
    }
}

/**
 * Server object using `getFunc` as callback
 */
const server = http.createServer(getFunc);  //Create HTTP server
server.listen(8080);    //Set thr server to listen on port 8080

//Create "job" that executes the code every day at 8 am UTC
const job = Schedule.scheduleJob({minute: 19}, () => {

    //Create new date object to use in the job
    const date = new Date();

    //Get the YYYY-MM-DD format of the date
    const currentDate = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${("0" + date.getDate()).slice(-2)}`

    //QoL stuff for the console
    console.log(`Current Date: ${currentDate} \nOverdue book-check in progress...`);

    //Create new pool connection
    pool.getConnection((poolError, connection) => {

        if(poolError){
            console.log(poolError)
            return;
        }

        //Perform query to check if any books are overdue
        connection.query(`SELECT * FROM \`innehav\` WHERE \`Påminnelse_1\` = '${currentDate}'`, (innehavError, innehavResult) => {

            if(innehavError){
                console.log(innehavError);
                return;
            }

            //If no book needs to be reminded today
            if(!innehavResult[0]){
                console.log('No book needs to be checked on the 1st today!');
                return;
            }

            //For-each loop that executes for every element in the result array
            innehavResult.forEach((element) => {
                
                console.log(element);

                //Select the student that corresponds to the id
                connection.query(`SELECT * FROM \`elever\` WHERE \`ID\` = '${element.ElevID}'`, (elevError, elevResult) => {

                    //Error when executing query
                    if(elevError){
                        console.log(elevError);
                        return;
                    }
                    
                    //If the student can't be found in the database for whatever reason
                    if(!elevResult[0]){
                        console.log(`Unknown Error: Student not found in DB. Check BookID: ${element.BokID}`);
                        return;
                    }

                    //The mail options to be used for the mail
                    const mailoptions = {
                        from: 'joelpeteket@hotmail.com',
                        to: `${elevResult[0].Mailadress}`,
                        subject: 'Påminnelse för bokinlämning',
                        text: `Hej! Du har en lånad bok som ej är återlämnad. Se till att lämna in den snarast så att du slipper betala pengar för den!
                        Namn på boken: ${element.boknamn}`
                    }

                    //Send a mail using the configured transporter and the mailoptions
                    transporter.sendMail(mailoptions, (mailError, mailInfo) => {

                        //If error, log the error in the console
                        if (mailError) {
                            console.log(mailError);
                            return;
                        } 

                        //Else log response in console
                        console.log('Email sent: ' + mailInfo.response);
                        
                    });
                });
            });
        });

        //Perform query to check if any books are overdue
        connection.query(`SELECT * FROM \`innehav\` WHERE \`Påminnelse_2\` = '${currentDate}'`, (innehavError, innehavResult) => {

            if(innehavError){
                console.log(innehavError);
                return;
            }

            //If no book needs to be reminded today
            if(!innehavResult[0]) {
                console.log('No book needs to be checked on the 2nd today!');
                return;
            }

            //For-each loop that executes for every element in the result array
            innehavResult.forEach((element) => {
                
                //Select the student that corresponds to the id
                connection.query(`SELECT * FROM \`elever\` WHERE \`ID\` = '${element.ElevID}'`, (elevError, elevResult) => {

                    //Error when executing query
                    if(elevError){
                        console.log(elevError);
                        return;
                    }
                    
                    //If the student can't be found in the database for whatever reason
                    if(!elevResult[0]){
                        console.log(`Unknown Error: Student not found in DB. Check BookID: ${element.BokID}`);
                        return;
                    }

                    //The mail options to be used for the mail
                    const mailoptions = {
                        from: 'joelpeteket@hotmail.com',
                        to: `${elevResult[0].Mailadress}`,
                        subject: 'Påminnelse för bokinlämning',
                        text: `Hej! Du har en lånad bok som ej är återlämnad. Se till att lämna in den snarast så att du slipper betala pengar för den!
                        Namn på boken: ${element.boknamn}`
                    }

                    //Send a mail using the configured transporter and the mailoptions
                    transporter.sendMail(mailoptions, (mailError, mailInfo) => {

                        //If error, log the error in the console
                        if (mailError) {
                            console.log(mailError);
                            return;
                        } 

                        //Else log response in console
                        console.log('Email sent: ' + mailInfo.response);
                        
                    });
                });
            });

            //Release the connection
            connection.release();
        });
    });
});