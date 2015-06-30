(function (jQuery, Firebase, Path) {
    "use strict";

    // the main firebase reference
    var rootRef = new Firebase('https://popping-inferno-1335.firebaseio.com');

    // pair our routes to our form elements and controller
    var routeMap = {
        '#/': {
            form: 'frmLogin',
            controller: 'login'
        },
            '#/logout': {
            form: 'frmLogout',
            controller: 'logout'
        },
            '#/profile': {
            form: 'frmProfile',
            controller: 'profile',
            authRequired: true // must be logged in to get here
        },
    };

    // create the object to store our controllers
    var controllers = {};

    // store the active form shown on the page
    var activeForm = null;

    var alertBox = $('#alert');

    function routeTo(route) {
        window.location.href = '#/' + route;
    }

    // Handle third party login providers
    // returns a promise
    function thirdPartyLogin(provider) {
        var deferred = $.Deferred();

        rootRef.authWithOAuthPopup(provider, function (err, user) {
            if (err) {
                deferred.reject(err);
            }

            if (user) {
                deferred.resolve(user);
            }
        });

        return deferred.promise();
    };

    // route to the specified route if sucessful
    // if there is an error, show the alert
    function handleAuthResponse(promise, route) {
        $.when(promise)
            .then(function (authData) {

            // route
            routeTo(route);

        }, function (err) {
            console.log(err);
            // pop up error
            showAlert({
                title: err.code,
                detail: err.message,
                className: 'alert-danger'
            });

        });
    }

    // options for showing the alert box
    function showAlert(opts) {
        var title = opts.title;
        var detail = opts.detail;
        var className = 'alert ' + opts.className;

        alertBox.removeClass().addClass(className);
        alertBox.children('#alert-title').text(title);
        alertBox.children('#alert-detail').text(detail);
    }

    /// Controllers
    ////////////////////////////////////////

    controllers.login = function (form) {

        // Form submission for logging in
        form.on('submit', function (e) {

            var userAndPass = $(this).serializeObject();
            var loginPromise = authWithPassword(userAndPass);
            e.preventDefault();

            handleAuthResponse(loginPromise, 'profile');

        });

        // Social buttons
        form.children('.bt-social').on('click', function (e) {

            var $currentButton = $(this);
            var provider = $currentButton.data('provider');
            var socialLoginPromise;
            e.preventDefault();

            socialLoginPromise = thirdPartyLogin(provider);
            handleAuthResponse(socialLoginPromise, 'profile');

        });

        form.children('#btAnon').on('click', function (e) {
            e.preventDefault();
            handleAuthResponse(authAnonymously(), 'profilex');
        });

    };

    // logout immediately when the controller is invoked
    controllers.logout = function (form) {
        rootRef.unauth();
    };

    controllers.profile = function (form) {
        // Check the current user
        var user = rootRef.getAuth();
        var userRef;

        // If no current user send to register page
        if (!user) {
            routeTo('login');
            return;
        }

        // Load user info
        userRef = rootRef.child('users').child(user.uid);
        userRef.once('value', function (snap) {
            var user = snap.val();
            if (!user) {
                return;
            }

            // set name field
            form.find('#nameInput').val(user.name);
        });

        // Save user's info to Firebase
        form.on('submit', function (e) {
            e.preventDefault();
		    var name = $('#nameInput').val();
			var text = $('#messageInput').val();
			var d = new Date();
			var curr_date = d.getDate();
			var curr_month = d.getMonth() + 1; //Months are zero based
			var curr_year = d.getFullYear();
			var time = curr_date + "-" + curr_month + "-" + curr_year;
			userRef.push({name: name, text: text, time: time});
			$('#messageInput').val('');
        });
        userRef.on('child_added', function(snapshot) {
        	var message = snapshot.val();
        	displayChatMessage(message.name, message.text, message.time);
      	});
      	function displayChatMessage(name, text, time) {
        	$('<div/>').text(text).prepend($('<em/>').text(name+'('+time+'): ')).appendTo($('#messagesDiv'));
        	$('#messagesDiv')[0].scrollTop = $('#messagesDiv')[0].scrollHeight;
      	};

    };

    /// Routing
    ////////////////////////////////////////

    // Handle transitions between routes
    function transitionRoute(path) {
        // grab the config object to get the form element and controller
        var formRoute = routeMap[path];
        var currentUser = rootRef.getAuth();

        // if authentication is required and there is no
        // current user then go to the register page and
        // stop executing
        if (formRoute.authRequired && !currentUser) {
            routeTo('login');
            return;
        }

        // wrap the upcoming form in jQuery
        var upcomingForm = $('#' + formRoute.form);

        // if there is no active form then make the current one active
        if (!activeForm) {
            activeForm = upcomingForm;
        }

        // hide old form and show new form
        activeForm.hide();
        upcomingForm.show().hide().fadeIn(750);

        // remove any listeners on the soon to be switched form
        activeForm.off();

        // set the new form as the active form
        activeForm = upcomingForm;

        // invoke the controller
        controllers[formRoute.controller](activeForm);
    }

    // Set up the transitioning of the route
    function prepRoute() {
        transitionRoute(this.path);
    }


    /// Routes
    ///  #/         - Login
    //   #/logout   - Logut
    //   #/register - Register
    //   #/profile  - Profile

    Path.map("#/").to(prepRoute);
    Path.map("#/logout").to(prepRoute);
    Path.map("#/profile").to(prepRoute);

    Path.root("#/");

    /// Initialize
    ////////////////////////////////////////

    $(function () {

        // Start the router
        Path.listen();

        // whenever authentication happens send a popup
        rootRef.onAuth(function globalOnAuth(authData) {

            if (authData) {
                showAlert({
                    title: 'Logged in!',
                    detail: 'Using ' + authData.provider,
                    className: 'alert-success'
                });
            } else {
                showAlert({
                    title: 'You are not logged in',
                    detail: '',
                    className: 'alert-info'
                });
            }

        });

    });

}(window.jQuery, window.Firebase, window.Path))

var myDataRef = new Firebase('https://popping-inferno-1335.firebaseio.com/');
      $('#messageInput').keypress(function (e) {
        if (e.keyCode == 13) {
          mydataRef.authWithOAuthPopup("google", function(error, authData) {
            if (error) {
              console.log("Login Failed!", error);
            } else {
              var name = $('#nameInput').val();
              var text = $('#messageInput').val();
              var d = new Date();
              var curr_date = d.getDate();
              var curr_month = d.getMonth() + 1; //Months are zero based
              var curr_year = d.getFullYear();
              var time = curr_date + "-" + curr_month + "-" + curr_year;
              myDataRef.push({name: name, text: text, time: time});
              $('#messageInput').val('');
            }
          });
        }
      });
      myDataRef.on('child_added', function(snapshot) {
        var message = snapshot.val();
        displayChatMessage(message.name, message.text, message.time);
      });
      function displayChatMessage(name, text, time) {
        $('<div/>').text(text).prepend($('<em/>').text(name+'('+time+'): ')).appendTo($('#messagesDiv'));
        $('#messagesDiv')[0].scrollTop = $('#messagesDiv')[0].scrollHeight;
      };