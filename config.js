const firebaseConfig = {
  apiKey: "AIzaSyAtlm1hohAPkZEeCqfMELXndeIjZQLdrK0",
  authDomain: "controlvacaciones-fe195.firebaseapp.com",
  projectId: "controlvacaciones-fe195",
  storageBucket: "controlvacaciones-fe195.firebasestorage.app",
  messagingSenderId: "804443865496",
  appId: "1:804443865496:web:26fd60f1233ab6f9816bed",
  measurementId: "G-FE7HK366Y1"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.db = firebase.database();
db.ref("jugadores").on("value", snap => {
    console.log("DATA FIREBASE:", snap.val());
});