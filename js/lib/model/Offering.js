//= require <Model>
//= require <Resource>

Model.Offering = Resource.make({
	url_patterns: {
		resource: '/offering/{0}.json'
	},
	relations: [
		belongs_to("course"),
		belongs_to("semester"),
		has_n("series", true),
		has_n("assessment_tasks", true)
	]
});