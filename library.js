(function(module) {
	"use strict";

	var User = module.parent.require('./user'),
		db = module.parent.require('./database'),
		meta = module.parent.require('./meta'),
		nconf = module.parent.require('nconf'),
		async = module.parent.require('async'),
		passport = module.parent.require('passport'),
		DataportenStrategy = require('passport-uninett-dataporten').Strategy;

	// Accented characters to plain ascii
	var unidecode = require('unidecode');
	
	var authenticationController = module.parent.require('./controllers/authentication');

	var constants = Object.freeze({
		'name': "dataporten",
		'admin': {
			'icon': 'fa-unlock',
			'route': '/plugins/sso-dataporten'
		}
	});

	var Dataporten = {};

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


	Dataporten.getStrategy = function(strategies, callback) {
		meta.settings.get('sso-dataporten', function(err, settings) {
			if (!err && settings.id && settings.secret) {
				passport.use(new DataportenStrategy({
					clientID: settings.id,
					clientSecret: settings.secret,
					callbackURL: nconf.get('url') + '/auth/dataporten/callback',
					passReqToCallback: true
				}, function(req, token, tokenSecret, profile, done) {
					if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
						// Save Dataporten -specific information to the user
						User.setUserField(req.user.uid, 'dataportenid', profile.id);
						db.setObjectField('dataportenid:uid', profile.id, req.user.uid);
						return done(null, req.user);
					}

					Dataporten.login(profile, function(err, user) {
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
		});
	};

	Dataporten.login = function(profile, callback) {

		// Check if we have an email present
		profile.email = Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0].value : '';
		// If not
		if(!profile.email) {
			// See if perhaps we got the Feide username - otherwise, make up a new, non-specific email address from the displayname
			profile.email = profile.username ? profile.username : unidecode(profile.displayName.replace(" ", ".")).toLowerCase() + '@users.noreply.dataporten.no';
		}
		// Check if Feide username was passed on, build another if not
		profile.username = profile.username ? profile.username.split("@")[0] : unidecode(profile.displayName.replace(" ", ".")).toLowerCase();

		// Check for photo
		profile.photo = Array.isArray(profile.photos) && profile.photos.length ? profile.photos[0].value : '';
		
		Dataporten.getUidByDataportenID(profile.id, function(err, uid) {
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
					User.setUserField(uid, 'dataportenid', profile.id);
					db.setObjectField('dataportenid:uid', profile.id, uid);
					callback(null, {
						uid: uid
					});
				};

				User.getUidByEmail(profile.email, function(err, uid) {
					if (!uid) {
						User.create({fullname: profile.displayName, username: profile.username, userslug: unidecode(profile.displayname.replace(' ', '-')).toLowerCase(),  email: profile.email}, function(err, uid) {
							if (err !== null) {
								callback(err);
							} else {
								// Set profile photo as well (if available)
								if(profile.photo){
									User.uploadFromUrl(uid, profile.photo, callback, function(err, uid) {
										if (err !== null) { callback(err); } 
										else { success(uid); }
									});
								}
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