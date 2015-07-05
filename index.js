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
    var googleUser = getStoredValue('googleUser');

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
                googleUser = user.google.displayName;
                storeValue('googleUser', googleUser);
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
            $('<p/>').text('Send as ' + getFirstNameFromGoogle(googleUser)).appendTo($('#userThatSendMessage'));;
            if (!user) {
                return;
            }

            // set name field
            form.find('#nameInput').val(user.name);
            window.alert(user.name);
            googleUser = user.name;
        });

        // Save user's info to Firebase
        form.on('submit', function (e) {
            e.preventDefault();
		    var name = $('#nameInput').val();
            var name = getFirstNameFromGoogle(googleUser);
			var text = $('#messageInput').val();
			var d = new Date();
			var time = Date.now()/1000;
			rootRef.push({name: name, text: text, time: time});
			$('#messageInput').val('');
        });
        /*rootRef.on('child_added', function(snapshot) {
        	var message = snapshot.val();
        	displayChatMessage(message.name, message.text, message.time);
      	});
      	function displayChatMessage(name, text, time) {
        	$('<div/>').text(text).prepend($('<em/>').text(name+'('+time+'): ')).appendTo($('#messagesDiv'));
        	$('#messagesDiv')[0].scrollTop = $('#messagesDiv')[0].scrollHeight;
      	};*/
        function getFirstNameFromGoogle(name) 
        {
            return name.split(' ')[0];
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

    rootRef.on('child_added', function(snapshot) {
        var message = snapshot.val();
        displayChatMessage(message.name, message.text, message.time);
    });
    function displayChatMessage(name, text, time) {
        //$('<div/>').text(text).prepend($('<em/>').text(name+'('+time+'): ')).appendTo($('#messagesDiv'));
        $('<div/>').text(text).prepend('<em/>' + name + ' (' + '<span data-livestamp=\"' + time + '\">just now</span>' + '): ').appendTo($('#messagesDiv'));
        $('#messagesDiv')[0].scrollTop = $('#messagesDiv')[0].scrollHeight;
    };
//<span data-livestamp="1436113177"></span>.




    function storeValue(key, value) {
        if (localStorage) {
            localStorage.setItem(key, value);
        } else {
            $.cookies.set(key, value);
        }
    }

    function getStoredValue(key) {
        if (localStorage) {
            return localStorage.getItem(key);
        } else {
            return $.cookies.get(key);
        }
    }

    /*function time_ago(time){

        switch (typeof time) {
            case 'number': break;
            case 'string': time = +new Date(time); break;
            case 'object': if (time.constructor === Date) time = time.getTime(); break;
            default: time = +new Date();
        }
        var time_formats = [
            [60, 'seconds', 1], // 60
            [120, '1 minute ago', '1 minute from now'], // 60*2
            [3600, 'minutes', 60], // 60*60, 60
            [7200, '1 hour ago', '1 hour from now'], // 60*60*2
            [86400, 'hours', 3600], // 60*60*24, 60*60
            [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
            [604800, 'days', 86400], // 60*60*24*7, 60*60*24
            [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
            [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
            [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
            [29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
            [58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
            [2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
            [5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
            [58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
        ];
        var seconds = (+new Date() - time) / 1000,
            token = 'ago', list_choice = 1;

        if (seconds == 0) {
            return 'Just now'
        }
        if (seconds < 0) {
            seconds = Math.abs(seconds);
            token = 'from now';
            list_choice = 2;
        }
        var i = 0, format;
        while (format = time_formats[i++]){
            if (seconds < format[0]) {
                if (typeof format[2] == 'string')
                    return format[list_choice];
                else
                    return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
            }
        }
        return time;
    }*/

}(window.jQuery, window.Firebase, window.Path))

/*var myDataRef = new Firebase('https://popping-inferno-1335.firebaseio.com/');
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
      };*/