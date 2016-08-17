define('admin/plugins/sso-dataporten', ['settings'], function(Settings) {
	'use strict';
	/* globals $, app, socket, require */

	var ACP = {};

	ACP.init = function() {
		Settings.load('sso-dataporten', $('.sso-dataporten-settings'));

		$('#save').on('click', function() {
			Settings.save('sso-dataporten', $('.sso-dataporten-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'sso-dataporten-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});
