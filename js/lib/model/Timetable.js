//= require <Model>
//= require <Resource>

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