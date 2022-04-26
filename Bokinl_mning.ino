#include <MFRC522.h>
#include <HttpClient.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

//Define necessary pins on ESP8266
#define NSS_PIN 15
#define RST_PIN 0
#define RED_LED 4   //D2
#define GREEN_LED 5 //D1
#define YELLOW_LED 2  //D4

//Initialise settings for the MFRC522 RFID Tag Reader
MFRC522 mfrc522(NSS_PIN, RST_PIN);


void setup() {

  //Initalise necessary operations
  Serial.begin(9600);
  SPI.begin();
  mfrc522.PCD_Init();

  //Define pinmodes for LED's and switch
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);

  //Connect to WiFi
  WiFi.begin("Joelpeteket", "Joelpe2022");

  //Print a dot every half a second until WiFi is connected
  Serial.print("Connecting");
  while (WiFi.status() != WL_CONNECTED){

    //Blink LED's while not connected and print dot in serial monitor
    digitalWrite(GREEN_LED, !digitalRead(GREEN_LED));
    digitalWrite(YELLOW_LED, !digitalRead(YELLOW_LED));
    digitalWrite(RED_LED, !digitalRead(RED_LED));
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  //Print when connected and print IP.
  Serial.print("Connected, IP address: ");
  Serial.println(WiFi.localIP());

}

void loop(){

  //Set LED's to LOW
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(YELLOW_LED, HIGH);
  
  //Wait until new RFID tag is presented
  if (!mfrc522.PICC_IsNewCardPresent()) return;

  
  //Read the info on the tag
  if (!mfrc522.PICC_ReadCardSerial()) return;
  
  //Set the yellow led to "working mode"
  digitalWrite(YELLOW_LED, LOW);

  //Print each letter of the UID
  Serial.print("UID tag :");
  String StudentID = "";
  byte letter;
  for (byte i = 0; i < mfrc522.uid.size; i++){
     StudentID.concat(String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : ""));  //Append to StudentID variable
     StudentID.concat(String(mfrc522.uid.uidByte[i], HEX));               //^ But in HEX
  }

  //Make all UID letters capital
  StudentID.toUpperCase();

  //Print the Student ID
  Serial.println(StudentID);

  //Speed limit
  delay(10);

  //Check if the StudentID is in DB, returns if function returns FALSE
  if(!Initial_Request(StudentID)){ 
    digitalWrite(RED_LED, HIGH);
    delay(1000);
    return;
  }
  
  //Speed limiter
  delay(1000);

  sendBookInfo(StudentID);

  //Speed limiter
  delay(1000);
}

//Checks the given string for unfriendly characters and replaces them with the UTF-8 encoding for it
String KollaSträng(String Sträng){

//Replace characters if found anywhere in the string
Sträng.replace("ö","%C3%B6");
Sträng.replace("Ö","%C3%96");
Sträng.replace("ä","%C3%A4");
Sträng.replace("Ä","%C3%84");
Sträng.replace("å","%C3%A5");
Sträng.replace("Å","%C3%85");
Sträng.replace("ü","%C3%BC");
Sträng.replace("Ü","%C3%9C");

return Sträng;  //Return the changed string
}

//Sends HTTP GET Request to server. Server returns status code.
//Status code tells if given ID exists in DB or not.
//Returns FALSE if error and TRUE if not.
bool Initial_Request(String StudentID){

  //Is WiFi still connected?
  if(WiFi.status()== WL_CONNECTED){
      
    //New WiFi and HTTP client
    WiFiClient client;
    HTTPClient http;

    //IP to the HTTP server
    String serverName = "http://172.16.0.19:8080/index.js?";
    
    //The path or parameters that are appended to the serverName
    String serverPath = serverName + "key=987654321&ID=" + StudentID + "&Method=Initial";
    
    //Begin transmission with the client and Path
    http.begin(client, serverPath.c_str());
    
    //Send HTTP GET request
    int httpResponseCode = http.GET();

    Serial.println(httpResponseCode);

    //Check value of Response Code
    switch(httpResponseCode){

      //ID exists in DB
      case 200:
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(YELLOW_LED, HIGH);
        return true;
      
      //ID does not exist
      case 400:
        digitalWrite(RED_LED, HIGH);
        return false;
      
      //Other codes and errors
      default:
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(RED_LED, HIGH);
        digitalWrite(YELLOW_LED, HIGH);
        return false;
    }
  }
}

//Mode for inserting new things into the database. (Students, Books etc)
void Insert_Mode(String StudentID){
   
  Serial.println("Skriv förnamn:");

  //Wait until someone inputs something
  while(Serial.available() == 0){}
  String Firstnamn = Serial.readStringUntil('\n');  //Put input in variable

  Serial.println("Skriv efternamn:");

  //Wait until someone inputs something
  while(Serial.available() == 0){}
  String Efternamn = Serial.readStringUntil('\n');  //Put input in variable

  //Check inputs for unfriendly characters
  Firstnamn = KollaSträng(Firstnamn);
  Efternamn = KollaSträng(Efternamn);
  
  //Is WiFi still connected?
  if(WiFi.status()== WL_CONNECTED){
      
    //New WiFi and HTTP client
    WiFiClient client;
    HTTPClient http;

    //IP to the HTTP server
    String serverName = "http://172.16.0.19:8080/index.js?";
    
    //The path or parameters that are appended to the serverName
    String serverPath = serverName + "key=987654321&Firstnamn=" + Firstnamn + "&Efternamn=" + Efternamn + "&ID=" + StudentID + "&Method=Insert";
    
    //Begin transmission with the client and Path
    http.begin(client, serverPath.c_str());
    
    //Send HTTP GET request
    int httpResponseCode = http.GET();
    
    //Print the response the server sends back
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    String payload = http.getString();
    Serial.println(payload);

    //Do thing depending on the code sent back
    switch (httpResponseCode) {

      case 200:   //Everything is good
        digitalWrite(GREEN_LED, HIGH);
        return;

      case 400:   //Incorrect parameters were sent
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(RED_LED, HIGH);  
        return;

      default:    //Any other weirdness
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(RED_LED, HIGH);
        digitalWrite(YELLOW_LED, HIGH);  
        return;   
    }

      //End the HTTP connection to free up resources
      http.end();
  }

  //If WiFi was disconnected, print
  else Serial.println("WiFi Disconnected");

}

void sendBookInfo(String StudentID){

  //Show that the device is ready for input
  Serial.println("Please present the book.");  
  digitalWrite(YELLOW_LED, HIGH);

  //Look for the book RFID Tag
  while(!mfrc522.PICC_IsNewCardPresent());
  
  //Read the info on it
  while(!mfrc522.PICC_ReadCardSerial()); 

  //Set LED to "working mode"
  digitalWrite(YELLOW_LED, LOW);

  //Used to store the UID of the book
  String BookID = "";

  //Transfer each bit of the UID to the string
  Serial.print("UID tag :");
  for (byte i = 0; i < mfrc522.uid.size; i++){
    BookID.concat(String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : ""));
    BookID.concat(String(mfrc522.uid.uidByte[i], HEX));
  }
  
  //All letters to upper case
  BookID.toUpperCase();  

  //Print the UID
  Serial.println(BookID);

  //Is WiFi still connected?
  if(WiFi.status()== WL_CONNECTED){
    
    //New WiFi and HTTP client
    WiFiClient client;
    HTTPClient http;
    
    //IP to the HTTP server
    String serverName = "http://172.16.0.19:8080/index.js?";
    
    //The parameters that are appended to the serverName
    String serverPath = serverName + "key=987654321&ID=" + StudentID + "&BookID=" + BookID + "&Method=Main";
    
    //Begin transmission with the client and Path
    http.begin(client, serverPath.c_str());
    
    //Get the response code that the server sent back
    int httpResponseCode = http.GET();
    
    //Print the code in serial monitor
    Serial.println(httpResponseCode);
    
    //Check value of Response Code
    switch(httpResponseCode){

      //ID exists in DB and Book exists in DB
      case 200:
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(YELLOW_LED, HIGH);
        return;
      
      //ID of Book does not exist in DB
      case 400:
        digitalWrite(RED_LED, HIGH);
        return;
      
      //Other codes and errors
      default:
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(RED_LED, HIGH);
        digitalWrite(YELLOW_LED, HIGH);
        return;
    }  
  }
}