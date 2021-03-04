const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp();
const firestore = admin.firestore();

exports.notifyNewEvent = functions.firestore
	.document('my_events/{eventId}')
	.onCreate((snap, context) => {
		return admin.firestore().doc('my_events_count/eventCount').get().then(snap => {
			var oldCount = snap.data().count;
			var newCount = oldCount + 1;
			return admin.firestore().doc('my_events_count/eventCount')
				.set({ count: newCount })
				.catch(err => {
					console.log(err);
				});
		}).catch(err => {
			console.log(err);
		});
	});

exports.sendPushMessage = functions.firestore
	.document('my_events/{eventId}')
	.onCreate(async (snap, context) => {
		const newEvent = snap.data();
		const eventName = newEvent.name;
		const eventVenue = newEvent.venue;

		// Get fcm_tokens document from database
		// since you can retrive only documents
		const fcmTokensDocument = await admin.firestore().collection('device_tokens')
			.doc('fcm_tokens').get();
		const fcmRegTokens = fcmTokensDocument.get('fcm_reg_tokens');

		// Construction payload object 
		const payload = {
			notification: {
				title: "New event created",
				body: eventName + "-" + eventVenue
			}
		};

		const tokensToRemove = [];
		const pushMessageResponse = await admin.messaging().sendToDevice(fcmRegTokens, payload);
		pushMessageResponse.results.forEach((result, index) => {
			const error = result.error;
			if (error) {
				console.log("Failed to send notification to ", fcmRegTokens[index], error);
				// Cleanup the tokens who are not registered anymore.
				if (error.code === 'messaging/invalid-registration-token' ||
					error.code === 'messaging/registration-token-not-registered') {
					// Remove logic
				}
			}
		});

		return Promise.resolve(1);
	});

exports.eventsCount = functions.https.onRequest((request, response) => {
 const eventCountDocRef = firestore.collection('my_events_count').doc('eventCount');
 const getDoc = eventCountDocRef.get()
   .then(doc => {
        if (!doc.exists) {
        console.log('No such document!');
        return response.send('Not Found')
    } 
    console.log(doc.data());
    return response.send(doc.data());
   })
   .catch(err => {
     console.log('Error getting document', err);
   });
});

exports.myEvents = functions.https.onRequest((request, response) => {
    const eventCountDocRef = firestore.collection('my_events');
    var eventArray = [];
    const getDoc = eventCountDocRef.get()
      .then(snapshot => {
        snapshot.forEach(doc => {
            eventArray.push(doc.data());
          });
       return response.send(eventArray);
      })
      .catch(err => {
        console.log('Error getting document', err);
      });
   });

   exports.EDvirData = functions.https.onRequest((request, response) => {
	let cid = request.query.customerId;
	let vid = request.query.vehicleId;
	let action = request.query.driverAction;

	let vehRef = firestore.collection('EDvir').doc(cid).collection(vid);
	let mandatory = vehRef.doc('Mandatory');
	if(action === 'login'){
		let preTripRef = vehRef.doc('Pretrip');
		let preTripDoc = preTripRef.get()
		.then(doc => {
			if (!doc.exists) {
			  console.log('No such document!');
			} else {
			  console.log('Document data:', doc.data());
			  return response.status(200).send(doc.data());
			}
		  })
		  .catch(err => {
			console.log('Error getting document', err);
		  });		
	}else{
		let postTripRef = vehRef.doc('Postrip');
		let postTripDoc = postTripRef.get()
		.then(doc => {
			if (!doc.exists) {
			  console.log('No such document!');
			} else {
			  console.log('Document data:', doc.data());
			  return response.status(200).send(doc.data());
			}
		  })
		  .catch(err => {
			console.log('Error getting document', err);
		  });
	}
   });