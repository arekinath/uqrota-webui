/**
 * @author Alex Wilson
 */

Model.Semester = Class.create(Resource, {});
Model.Semester.cache = {};
Model.Semester.get = function(id, callback) {
	Resource.get(Model.Semester, '/semester/'+id+'.json', id, callback);
}

Model.Program = Class.create(Resource, {});
Model.Program.cache = {};
Model.Program.get = function(id, callback) {
	Resource.get(Model.Program, '/program/'+id+'.json', id, callback);
}
Model.Program.relations = [has_n("plans")];

Model.Plan = Class.create(Resource, {});
Model.Plan.cache = {};
Model.Plan.get = function(id, callback) {
	Resource.get(Model.Plan, '/plan/'+id+'.json', id, callback);
}
Model.Plan.relations = [belongs_to("program"), has_n("course_groups")];

Model.CourseGroup = Class.create(Resource, {});
Model.CourseGroup.cache = {};
Model.CourseGroup.get = function(id, callback) {
	Resource.get(Model.CourseGroup, '/coursegroup/'+id+'.json', id, callback);
}
Model.CourseGroup.relations = [belongs_to("plan"), has_n("courses")];

Model.Course = Class.create(Resource, {});
Model.Course.cache = {};
Model.Course.get = function(code, callback) {
	Resource.get(Model.Course, '/course/'+code+'.json', code, callback);
}
Model.Course.relations = [has_n("prereqs"), has_n("dependents"), has_n("offerings")];

Model.Offering = Class.create(Resource, {});
Model.Offering.cache = {};
Model.Offering.get = function(id, callback) {
	Resource.get(Model.Offering, '/offering/'+id+'.json', id, callback);
}
Model.Offering.relations = [belongs_to("course"), belongs_to("semester"), has_n("series", true), has_n("assessment_tasks", true)];

Model.AssessmentTask = Class.create(Resource, {});
Model.AssessmentTask.cache = {};
Model.AssessmentTask.get = Resource._get_cache_only(Model.AssessmentTask);
Model.AssessmentTask.relations = [belongs_to("offering")];

Model.TimetableSeries = Class.create(Resource, {});
Model.TimetableSeries.cache = {};
Model.TimetableSeries.get = Resource._get_cache_only(Model.TimetableSeries);
Model.TimetableSeries.relations = [belongs_to("offering"), has_n("groups", true)];

Model.TimetableGroup = Class.create(Resource, {});
Model.TimetableGroup.cache = {};
Model.TimetableGroup.get = Resource._get_cache_only(Model.TimetableGroup);
Model.TimetableGroup.relations = [belongs_to("series"), has_n("sessions", true)];

Model.TimetableSession = Class.create(Resource, {});
Model.TimetableSession.cache = {};
Model.TimetableSession.get = Resource._get_cache_only(Model.TimetableSession);
Model.TimetableSession.relations = [belongs_to("group"), has_n("events", true)];

Model.TimetableEvent = Class.create(Resource, {});
Model.TimetableEvent.cache = {};
Model.TimetableEvent.get = Resource._get_cache_only(Model.TimetableEvent);
Model.TimetableEvent.relations = [belongs_to("session")];
