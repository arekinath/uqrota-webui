//= require <Resource>
//= require <Model>

Model.User = Resource.make({
	url_patterns: {
		resource: '/user/{0}.json',
		count: '/user/count.json'
	},
	relations: [
		has_n('user_semesters'),
		has_n('notifications')
	]
},{
	setPassword: function(pass) {
		this.data.password = pass;
	}
});