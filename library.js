(function(module) {
	"use strict";

	var User = module.parent.require('./user'),
		meta = module.parent.require('./meta'),
		db = module.parent.require('../src/database'),
		passport = module.parent.require('passport'),
		passportDataporten = require('passport-uninett-dataporten').Strategy,
		fs = module.parent.require('fs'),
		path = module.parent.require('path'),
		nconf = module.parent.require('nconf'),
		async = module.parent.require('async');

	var authenticationController = module.parent.require('./controllers/authentication');

	var constants = Object.freeze({
		'name': "Dataporten",
		'admin': {
			'route': '/plugins/sso-dataporten',
			'icon': 'fa-unlock'
		}
	});

	var Dataporten = {};

	Dataporten.init = function(data, callback) {
		function render(req, res, next) {
			res.render('admin/plugins/sso-dataporten', {});
		}

		data.router.get('/admin/plugins/sso-dataporten', data.middleware.admin.buildHeader, render);
		data.router.get('/api/admin/plugins/sso-dataporten', render);

		callback();
	}

	Dataporten.getStrategy = function(strategies, callback) {
		meta.settings.get('sso-dataporten', function(err, settings) {
			if (!err && settings['id'] && settings['secret']) {
				passport.use(new passportDataporten({
					clientID: settings['id'],
					clientSecret: settings['secret'],
					callbackURL: nconf.get('url') + '/auth/dataporten/callback',
					passReqToCallback: true
				}, function(req, accessToken, refreshToken, profile, done) {
					if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
						// Save Dataporten-specific information to the user
						User.setUserField(req.user.uid, 'dataportenid', profile.id);
						db.setObjectField('dataportenid:uid', profile.id, req.user.uid);
						return done(null, req.user);
					}

					Dataporten.login(profile.id, profile.displayName, profile.emails[0].value, profile.photos[0].value, function(err, user) {
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
					icon: constants.admin.icon,
					// scope: 'https://www.dataportenapis.com/auth/userinfo.profile https://www.dataportenapis.com/auth/userinfo.email',
					//scope: 'https://auth.dataporten.no/userinfo',
					prompt: 'select_account'
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

	Dataporten.login = function(dataportenid, handle, email, picture, callback) {
		Dataporten.getUidByDataportenId(dataportenid, function(err, uid) {
			if(err) {
				return callback(err);
			}

			if (uid !== null) {
				// Existing User
				callback(null, {
					uid: uid
				});
			} else {
				// New User
				var success = function(uid) {
					meta.settings.get('sso-dataporten', function(err, settings) {
						var autoConfirm = settings && settings['autoconfirm'] === "on" ? 1 : 0;
						User.setUserField(uid, 'email:confirmed', autoConfirm);
						// Save dataporten-specific information to the user
						User.setUserField(uid, 'dataportenid', dataportenid);
						db.setObjectField('dataportenid:uid', dataportenid, uid);

						// Save their photo, if present
						if (picture) {
							User.setUserField(uid, 'uploadedpicture', picture);
							User.setUserField(uid, 'picture', picture);
						}

						callback(null, {
							uid: uid
						});

					});
				};

				User.getUidByEmail(email, function(err, uid) {
					if(err) {
						return callback(err);
					}

					if (!uid) {
						User.create({username: handle, email: email}, function(err, uid) {
							if(err) {
								return callback(err);
							}

							success(uid);
						});
					} else {
						success(uid); // Existing account -- merge
					}
				});
			}
		});
	};

	Dataporten.getUidByDataportenId = function(dataportenid, callback) {
		db.getObjectField('dataportenid:uid', dataportenid, function(err, uid) {
			if (err) {
				return callback(err);
			}
			callback(null, uid);
		});
	};

	Dataporten.addMenuItem = function(custom_header, callback) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		callback(null, custom_header);
	}

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