//= require <Resource>
//= require <Model>

Model.Semester = Resource.make({
	url_patterns: {
		resource: '/semester/{0}.json'
	},
	relations: [
		belongs_to('pred'),
		belongs_to('succ')
	]
});

Model.Program = Resource.make({
	url_patterns: {
		resource: '/program/{0}.json',
		find: '/programs/find.json'
	},
	relations: [
		has_n('plans')
	]
});

Model.Plan = Resource.make({
	url_patterns: {
		resource: '/plan/{0}.json'
	},
	relations: [
		belongs_to('program'),
		has_n('course_groups')
	]
});

Model.CourseGroup = Resource.make({
	url_patterns: {
		resource: '/coursegroup/{0}.json'
	},
	relations: [
		belongs_to('plan'),
		has_n('courses')
	]
});

Model.Course = Resource.make({
	url_patterns: {
		resource: '/course/{0}.json',
		find: '/courses/find.json'
	},
	relations: [
		has_n("prereqs"),
		has_n("dependents"),
		has_n("offerings")
	]
});

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

Model.AssessmentTask = Resource.make({
	relations: [
		belongs_to('offering')
	]
});

Model.TimetableSeries = Resource.make({
	relations: [
		belongs_to('offering'),
		has_n('groups', true)
	]
});

Model.TimetableGroup = Resource.make({
	relations: [
		belongs_to('series'),
		has_n('sessions', true)
	]
});

Model.TimetableSession = Resource.make({
	relations: [
		belongs_to('group'),
		has_n('events', true)
	]
});

Model.TimetableEvent = Resource.make({
	relations: [
		belongs_to('session')
	]
});
