const {AffindaAPI, AffindaCredential} = require("@affinda/affinda");
const firebase = require("firebase-admin");
const env = require("dotenv").config();
var serviceAccount = require("./credentials/resumeparserapi-firebase-adminsdk-kpig9-ae3e1536b8.json");


// initializing firebase app

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  storageBucket: "rat2-edaa6.appspot.com",
  databaseURL: "https://rat2-edaa6-default-rtdb.asia-southeast1.firebasedatabase.app"
});
// authentication with api
const credentials = new AffindaCredential(process.env.AFFINDA_API_KEY);
const affindaClient = new AffindaAPI(credentials);

// instance of firebase storage
const firebaseStorage = firebase.storage();
const database = firebase.database();

// exporting required objects
module.exports = { affindaClient, firebaseStorage, database }
