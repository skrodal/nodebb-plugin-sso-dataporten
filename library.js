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
	
	var winston = require('winston');
	
	var constants = Object.freeze({
		'name': "Dataporten",
		'admin': {
			'icon': 'fa-unlock',
			'route': '/plugins/sso-dataporten'
		}
	});

	var Dataporten = {};

	Dataporten.getStrategy = function(strategies, callback) {
		meta.settings.get('sso-dataporten', function(err, settings) {
			if (!err && settings.id && settings.secret) {
				passport.use(new DataportenStrategy({
					clientID: settings.id,
					clientSecret: settings.secret,
					callbackURL: nconf.get('url') + '/auth/dataporten/callback',
					passReqToCallback: true
				}, function(req, token, tokenSecret, profile, done) {
					
					winston.info(profile);
					winston.info(req);
					

					if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
						// Save Dataporten -specific information to the user
						User.setUserField(req.user.uid, 'dataportenid', profile.id);
						db.setObjectField('dataportenid:uid', profile.id, req.user.uid);
						return done(null, req.user);
					}

					var email = Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0].value : '';
					// Email is also username for now (second arg.)
					Dataporten.login(profile.id, 'simon.skrodal_uninett', email, profile.displayName, function(err, user) {
						if (err) {
							return done(err);
						}

						authenticationController.onSuccessfulLogin(req, user.uid);
						done(null, user);
					});
				}));

				strategies.push({
					name: 'dataporten',
					url: '/auth/dataporten',
					callbackURL: '/auth/dataporten/callback',
					icon: constants.admin.icon
				});
			}

			callback(null, strategies);
		});
	};

	Dataporten.getAssociation = function(data, callback) {
		User.getUserField(data.uid, 'dataportenid', function(err, dataportenid) {
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

	Dataporten.login = function(dataportenID, username, email, displayName, callback) {
		if (!email) {
			email = dataportenID + '@users.noreply.dataporten.no';
		}
		
		Dataporten.getUidByDataportenID(dataportenID, function(err, uid) {
			if (err) {
				return callback(err);
			}

			if (uid) {
				// Existing User
				callback(null, {
					uid: uid
				});
			} else {
				// New User
				var success = function(uid) {
					User.setUserField(uid, 'dataportenid', dataportenID);
					db.setObjectField('dataportenid:uid', dataportenID, uid);
					callback(null, {
						uid: uid
					});
				};

				User.getUidByEmail(email, function(err, uid) {
					if (!uid) {
						User.create({username: username, email: email, name: displayName}, function(err, uid) {
							if (err !== null) {
								callback(err);
							} else {
								success(uid);
							}
						});
					} else {
						success(uid); // Existing account -- merge
					}
				});
			}
		});
	};

	Dataporten.getUidByDataportenID = function(dataportenID, callback) {
		db.getObjectField('dataportenid:uid', dataportenID, function(err, uid) {
			if (err) {
				callback(err);
			} else {
				callback(null, uid);
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
		var uid = data.uid;

		async.waterfall([
			async.apply(User.getUserField, uid, 'dataportenid'),
			function(oAuthIdToDelete, next) {
				db.deleteObjectField('dataportenid:uid', oAuthIdToDelete, next);
			}
		], function(err) {
			if (err) {
				winston.error('[sso-dataporten] Could not remove OAuthId data for uid ' + uid + '. Error: ' + err);
				return callback(err);
			}
			callback(null, uid);
		});
	};

	module.exports = Dataporten;
}(module));