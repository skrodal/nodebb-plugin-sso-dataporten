(function(module) {
	"use strict";

	var User = module.parent.require('./user'),
		db = module.parent.require('./database'),
		meta = module.parent.require('./meta'),
		nconf = module.parent.require('nconf'),
		async = module.parent.require('async'),
		passport = module.parent.require('passport'),
		DataportenStrategy = require('passport-dataporten').Strategy;

	var authenticationController = module.parent.require('./controllers/authentication');

	var constants = Object.freeze({
		'name': "Dataporten",
		'admin': {
			'icon': 'fa-unlock',
			'route': '/plugins/sso-dataporten',
			'name': 'Dataporten',
			'color': '#E92631'
		}
	});

	var Dataporten = {};

	Dataporten.getStrategy = function(strategies, callback) {
		meta.settings.get('sso-dataporten', function(err, settings) {
			if (!err && settings.id && settings.secret) {
				passport.use(new DataportenStrategy({
					clientID: settings.id,
					clientSecret: settings.secret,
					callbackURL: nconf.get('url') + '/auth/dataporten/callback' 
					//,  passReqToCallback: true
				}, 
				//function(req, token, tokenSecret, profile, done) {

			    function(accessToken, refreshToken, profile, done) {
			        User.findOrCreate({ id: profile.id }, function (err, user) {
			            return done(err, user);
			    });


/*

					if (req.hasOwnProperty('user') && req.user.hasOwnProperty('userid') && req.user.userid > 0) {
						// Save Dataporten -specific information to the user
						User.setUserField(req.user.userid, 'dataportenid', profile.id);
						db.setObjectField('dataportenid:id', profile.id, req.user.userid);
						return done(null, req.user);
					}

*/
					var email = Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0].value : '';

					Dataporten.login(profile.id, profile.displayName, email, function(err, user) {
						if (err) {
							return done(err);
						}

						authenticationController.onSuccessfulLogin(req, user.userid);
						done(null, user);
					});
				}));

				strategies.push({
					name: 'dataporten',
					url: '/auth/dataporten',
					callbackURL: '/auth/dataporten/callback',
					icon: constants.admin.icon
					//scope: 'userid:email:profile'
				});
			}

			callback(null, strategies);
		});
	};

	Dataporten.getAssociation = function(data, callback) {
		User.getUserField(data.userid, 'dataportenid', function(err, dataportenid) {
			if (err) {
				return callback(err, data);
			}

			if (dataportenid) {
				data.associations.push({
					associated: true,
					name: constants.name,
					icon: constants.admin.icon
				});
			} else {
				data.associations.push({
					associated: false,
					url: nconf.get('url') + '/auth/dataporten',
					name: constants.name,
					icon: constants.admin.icon
				});
			}

			callback(null, data);
		})
	};

	Dataporten.login = function(dataportenID, username, email, callback) {
		if (!email) {
			email = dataportenID + '@users.noreply.dataporten.no';
		}
		
		Dataporten.getUidByDataportenID(dataportenID, function(err, id) {
			if (err) {
				return callback(err);
			}

			if (id) {
				// Existing User
				callback(null, {
					id: id
				});
			} else {
				// New User
				var success = function(id) {
					User.setUserField(id, 'dataportenid', dataportenID);
					db.setObjectField('dataportenid:id', dataportenID, id);
					callback(null, {
						id: id
					});
				};

				User.getUidByEmail(email, function(err, id) {
					if (!id) {
						User.create({username: username, email: email}, function(err, id) {
							if (err !== null) {
								callback(err);
							} else {
								success(id);
							}
						});
					} else {
						success(id); // Existing account -- merge
					}
				});
			}
		});
	};

	Dataporten.getUidByDataportenID = function(dataportenID, callback) {
		db.getObjectField('dataportenid:id', dataportenID, function(err, id) {
			if (err) {
				callback(err);
			} else {
				callback(null, id);
			}
		});
	};

	Dataporten.addMenuItem = function(custom_header, callback) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		callback(null, custom_header);
	};

	Dataporten.init = function(data, callback) {
		function renderAdmin(req, res) {
			res.render('admin/plugins/sso-dataporten', {
				callbackURL: nconf.get('url') + '/auth/dataporten/callback'
			});
		}

		data.router.get('/admin/plugins/sso-dataporten', data.middleware.admin.buildHeader, renderAdmin);
		data.router.get('/api/admin/plugins/sso-dataporten', renderAdmin);

		callback();
	};

	Dataporten.deleteUserData = function(data, callback) {
		var id = data.id;

		async.waterfall([
			async.apply(User.getUserField, id, 'dataportenid'),
			function(oAuthIdToDelete, next) {
				db.deleteObjectField('dataportenid:id', oAuthIdToDelete, next);
			}
		], function(err) {
			if (err) {
				winston.error('[sso-dataporten] Could not remove OAuthId data for user ID ' + id + '. Error: ' + err);
				return callback(err);
			}
			callback(null, id);
		});
	};

	module.exports = Dataporten;
}(module));
