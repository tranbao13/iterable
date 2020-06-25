/*---------------------------OTHER FUNCTIONS-----------------------------*/
function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}

if (getCookie('iterableEndUserId')) {
    localStorage.setItem('realEmail',decodeURIComponent(getCookie('iterableEndUserId')));
}

function pushToArray(arr, obj) {
    var index = arr.findIndex(function (e) {
      return e.id === obj.id;
    });

    if (index === -1) {
      arr.unshift(obj); //latest product will be added to the start of the array
    } else {
      arr[index] = obj;
    }
}

function keepFive(arr) {
    if (arr.length>5) {
        var  minus = arr.length - 5;
        arr.splice(5,minus); 
    }
}

function dummyEmail(token) {
    return token.substr(0,10) + "@placeholder.email"; // Generate dummy email if user has no real email before
}
/*---------------------------END OTHER FUNCTIONS-----------------------------*/


/*---------------------------ITERABLE API CALLS-----------------------------*/
function iterableAPI(iterableKey,type,url,data) {
    if (data === undefined) {data = '';}
    switch(type) {
      case "POST" :
        var request = new XMLHttpRequest();
        var json = JSON.stringify(data);
        request.open("POST", url, true);
        request.setRequestHeader("Api-key",iterableKey);
        request.setRequestHeader('Content-type','application/json; charset=utf-8');
        request.onload = function () {
          var res = JSON.parse(request.responseText);
          if (request.readyState == 4 && request.status == "200") {
            console.log("Call succeeded");
            return request.readyState;
          } else {
            console.error(res);
          }
        }
        request.send(json);
        break;
      case "GET":
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.setRequestHeader("Api-key",iterableKey);
        request.setRequestHeader('Content-type','application/json; charset=utf-8');
        request.onload = function () {
          var res = JSON.parse(request.responseText);
          if (request.readyState == 4 && request.status == "200") {
            console.log("Call succeeded");
          } else {
            console.error(res);
          }
          return request.responseText;
        }
        request.send();      
    } 
}
/*-----------------------------END API CALLS-------------------------------*/

/*-------------------------DEFINING ITERABLE METHODS------------------------*/
function iterable(userEmail) {
    const self = { 
        organicSubscribe: (iterableKey,mergeFields) => { //mergeFields is an object
            var data = {
                email: userEmail,
                dataFields: mergeFields   
            }
            iterableAPI(iterableKey,"POST","https://api.iterable.com/api/users/update",data);
            localStorage.setItem('realEmail',userEmail);
        },
        browseProducts: (iterableKey,product) => { //product is an object
            var eventData = {
                email: userEmail,
                eventName: "browseProducts",
                dataFields: {
                    "viewProductItem": [product]
                }
            }

            async function updateToProfile() {
                await updateToEvent()
                // updateToProfile after updateToEvent completes
                var profileData = {
                    email: userEmail,
                    dataFields: { //localStorage updateViewProducts is an array of objects
                        "updateViewProducts": JSON.parse(localStorage.getItem("updateViewProducts"))
                    }
                }
                iterableAPI(iterableKey,"POST","https://api.iterable.com/api/users/update",profileData);
            }

            async function updateToEvent() {
                var browseProductsArray = (localStorage.getItem("updateViewProducts")==null)? [] : JSON.parse(localStorage.getItem("updateViewProducts"))
                pushToArray(browseProductsArray, product);
                keepFive(browseProductsArray);
                if(browseProductsArray.length<=5) {
                    localStorage.setItem('updateViewProducts',JSON.stringify(browseProductsArray));
                }
                iterableAPI(iterableKey,"POST","https://api.iterable.com/api/events/track",eventData)
                return;
            } 

            updateToProfile();
        },
        addToCart: (iterableKey,products) => { //product is an array of objects
            var data = {
                user: {
                    email: userEmail    
                },
                items: products                
            }
            iterableAPI(iterableKey,"POST","https://api.iterable.com/api/commerce/updateCart",data)
        },
        purchase: (iterableKey,transactionId, products, totalPrice) => {
            var checkCookie = getCookie("iterableEmailCampaignId");
            if(checkCookie!=="") {
                var data = {
                    id: transactionId,
                    user: {
                        email: userEmail    
                    },
                    items: products,
                    campaignId:Number(checkCookie),
                    templateId: Number(getCookie('iterableTemplateId')),
                    total: totalPrice                
                }
            }
            else {
                var data = {
                    id: transactionId,
                    user: {
                        email: userEmail    
                    },
                    items: products,
                    total: totalPrice                
                }
            }
            iterableAPI(iterableKey,"POST","https://api.iterable.com/api/commerce/trackPurchase",data)
        }
    }
    return self
}
/*--------------------------END DEFINING ITERABLE METHODS-------------------*/

/*--------------------------------------FIREBASE WEBPUSH-------------------------------------------------------*/
function iterableWebpush(iterableKey) {
    const self = {
        initiate: (config) => {
            /*------------- Firebase config -------------------*/

            firebase.initializeApp(config); 

            var messaging = firebase.messaging();
            /*------------------- Done config and Initialize Firebase ------------------------*/


            /*------------- Register service worker and Handling messages -------------------*/
            navigator.serviceWorker.register('/firebase-messaging-sw.js',{ updateViaCache: 'none' })
            .then(function(registration) {
            messaging.useServiceWorker(registration);

            // [START request permission]
            if(Notification.permission !== "granted") {
            messaging.requestPermission()
            .then(function() {
            console.log('Notification permission granted.');
            return messaging.getToken();
            })
            .then(function(token){
                // Post a browser token
                var url = "https://api.iterable.com/api/users/registerBrowserToken";
                var data = {};
                data.email = localStorage.getItem('realEmail')? localStorage.getItem('realEmail') : dummyEmail(token);
                localStorage.setItem('pushEmail', data.email);     
                data.browserToken  = token;
                iterableAPI(iterableKey,"POST",url,data);
                console.log(data.email);
                console.log(data.browserToken);
            })
            .catch(function(err) {
            console.log('Unable to get permission to notify.', err)
            })}
            // [END request permission] 

            // [START Foreground message handling]
            messaging.onMessage(function(payload) {
                console.log('Message received. ', payload);
                notificationTitle = payload.notification.title;
                notificationOptions = {
                    'body': payload.notification.body,
                    'icon': payload.notification.icon,
                    'actions': [{
                    'action': payload.notification.click_action,
                    'title':'Xem ngay'
                }]
                }
                registration.showNotification(notificationTitle, notificationOptions);
                var latestPayload = {
                'messageId': payload.data.messageId,
                'campaignId': payload.data.campaignId,
                'templateId': payload.data.templateId
                }
                sessionStorage.setItem('latestPayload',JSON.stringify(latestPayload));
            });
            // [END Foreground message handling]

            // [START Click tracking handling]
                navigator.serviceWorker.addEventListener('message', function(event) {
                    console.log('payload from message event of sw:', event);
                    if(event.data.firebaseMessaging) {
                        if(event.data.firebaseMessaging.type === "notification-clicked") {
                        // Iterable click tracking api here - BACKGROUND MESSAGE
                        var payload = event.data.firebaseMessaging.payload.data;
                        var a = "https://api.iterable.com/api/events/trackWebPushClick";
                        var postData = {
                            'email': localStorage.getItem('pushEmail')? localStorage.getItem('pushEmail'):localStorage.getItem('realEmail'), // Put identifier here
                            'messageId': payload.messageId,
                            'campaignId': Number(payload.campaignId),
                            'templateId': Number(payload.templateId)
                        };
                        iterableAPI(iterableKey,"POST",a,postData);
                        console.log("Clicked background");
                        }
                    }
                    if(typeof event.data === "string") {
                        var a = JSON.parse(event.data);
                        if (a.type === "notificationclick") {
                            // Iterable click tracking api here - FOREGROUND MESSAGE
                            var notifPayload = JSON.parse(sessionStorage.getItem('latestPayload'));
                            var b = "https://api.iterable.com/api/events/trackWebPushClick";
                            var postData = {
                            'email': localStorage.getItem('pushEmail')? localStorage.getItem('pushEmail'):localStorage.getItem('realEmail'), // Put identifier here
                            'messageId': notifPayload.messageId,
                            'campaignId': Number(notifPayload.campaignId),
                            'templateId': Number(notifPayload.templateId)
                            };
                            iterableAPI(iterableKey,"POST",b,postData);
                            console.log("Clicked foreground");
                        }
                    } 
                });
            })
            /*--------------------------------- End service worker cycle ----------------------------------------------*/ 
        },
        dummyCheck: () => {
            /*--------------------------------- Dummy email replacement ----------------------------------------------*/
            if(localStorage.getItem('pushEmail')&&localStorage.getItem('realEmail')) {
                if(localStorage.getItem('pushEmail').includes('placeholder.email')) {
                    
                    // Check if realEmail exist in Iterable before
                    var url = "https://api.iterable.com/api/users/" + localStorage.getItem('realEmail');
                    var checkExist = iterableAPI(iterableKey,"GET",url,data);

                    // If no, replace push email in Iterable with real email & remove pushEmail from localStorage
                    if(checkExist === "{}") {
                    var url = "https://api.iterable.com/api/users/updateEmail";
                    var data = {};
                    data.currentEmail = localStorage.getItem('pushEmail');
                    data.newEmail = localStorage.getItem('realEmail');
                    iterableAPI(iterableKey,"POST",url,data);
                    localStorage.removeItem('pushEmail');
                    }

                    // If yes, update realEmail with BrowserToken && unsub pushEmail from all channels in IT && remove pushEmail in localStorage
                    if(checkExist !== "{}") {
                    // -- Update browsertoken      
                    //-- Get browserToken from indexeddb
                    var req = indexedDB.open("firebase-messaging-database");
                    req.onsuccess = function(event) {
                        var db = event.target.result;
                        var transaction = db.transaction(["firebase-messaging-store"], "readwrite");
                        var keyValue = transaction.objectStore('firebase-messaging-store').getAll();
                        keyValue.onsuccess = function(event) {
                        var linka = 'https://api.iterable.com/api/users/registerBrowserToken';
                        var dta = {};
                        dta.email = localStorage.getItem('realEmail');
                        dta.browserToken = event.target.result[0]['token'];
                        iterableAPI(iterableKey,"POST",linka,dta);
                        }
                    }      
                    // -- Done updating token

                    // Unsub dummy email from IT
                    var linkb = 'https://api.iterable.com/api/users/updateSubscriptions'
                    var dtb = {};
                    dtb.email = localStorage.getItem('pushEmail');
                    dtb.unsubscribedChannelIds = [31072,29913,29912,29911]; //Replace by your channel IDs
                    iterableAPI(iterableKey,"POST",linkb,dtb);
                    
                    //Remove dummy email from localStorage
                    localStorage.removeItem('pushEmail');     
                    
                    }
                }
            }
            /*--------------------------------- DONE Dummy email replacement ----------------------------------------------*/
        }
    }
    return self;
}

/*--------------------------FIREBASE WEBPUSH-------------------*/
