 // [START initialize_firebase_in_sw]
 // Give the service worker access to Firebase Messaging.
 // Note that you can only use Firebase Messaging here, other Firebase libraries
 // are not available in the service worker.
 importScripts('firebase-app.js');
 importScripts('firebase-messaging.js');

 // Initialize the Firebase app in the service worker by passing in
 // your app's Firebase config object.
 // https://firebase.google.com/docs/web/setup#config-object
 firebase.initializeApp({
   apiKey: "AIzaSyAlqEfMi04xFzVF2ErgZNK8xGSHgca6--Q",
    authDomain: "ravenclaw-coder.firebaseapp.com",
    databaseURL: "https://ravenclaw-coder.firebaseio.com",
    projectId: "ravenclaw-coder",
    storageBucket: "ravenclaw-coder.appspot.com",
    messagingSenderId: "498188075236",
    appId: "1:498188075236:web:3f62fca9f5070437226cf1",
    measurementId: "G-NLPC3T74YE"
 });

 // Retrieve an instance of Firebase Messaging so that it can handle background
 // messages.
 const messaging = firebase.messaging();
 // [END initialize_firebase_in_sw]


// If you would like to customize notifications that are received in the
// background (Web app is closed or not in browser focus) then you should
// implement this optional method.
// [START background_handler]
messaging.setBackgroundMessageHandler(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = 'Background Message Title';
  const notificationOptions = {
    body: 'Background Message body.',
    icon: '/firebase-logo.png',
    click_action: 'https://ravenclawcoder.com'
  };

  return self.registration.showNotification(notificationTitle,
    notificationOptions);
});


self.addEventListener("notificationclick", function(event) {
    const clickedNotification = event.notification;
    
    var options = {
      body: event.notification.body,
      icon: event.notification.icon,
      click_action: event.notification.actions[0].action,
      data: {
        click_action: event.notification.actions[0].action
      },
      type: event.type
    };
    
    
    event.waitUntil(self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then(function (all) {
            for (var i=0; i < all.length; i++) {
            if (all[i].focused === true || all[i].visibilityState === "visible") {
              all[i].postMessage(JSON.stringify(options));
              self.clients.openWindow( event.notification.actions[0].action)
              break;
            }
        }

    },function(err) {}));
    
});
     
// [END background_handler]
