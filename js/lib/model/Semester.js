//= require <Model>
//= require <Resource>

Model.Semester = Resource.make({
	url_patterns: {
		resource: '/semester/{0}.json'
	},
	relations: [
		belongs_to('pred'),
		belongs_to('succ')
	]
},{
	
});