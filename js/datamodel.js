/**
 * @author Alex Wilson
 */

var Semester = Class.create(Resource, {});
Semester.cache = {};
Semester.get = function(id, callback) {
	Resource.get(Semester, '/semester/'+id+'.json', id, callback);
}

var Program = Class.create(Resource, {});
Program.cache = {};
Program.get = function(id, callback) {
	Resource.get(Program, '/program/'+id+'.json', id, callback);
}

var Plan = Class.create(Resource, {});
Plan.cache = {};
Plan.get = function(id, callback) {
	Resource.get(Plan, '/plan/'+id+'.json', id, callback);
}

var CourseGroup = Class.create(Resource, {});
CourseGroup.cache = {};
CourseGroup.get = function(id, callback) {
	Resource.get(CourseGroup, '/coursegroup/'+id+'.json', id, callback);
}

var Course = Class.create(Resource, {});
Course.cache = {};
Course.get = function(code, callback) {
	Resource.get(Course, '/course/'+code+'.json', code, callback);
}

var Offering = Class.create(Resource, {
	setData: function(data) {
		$super(data);
		
		var ats = data.assessment_tasks;
		for (var i = 0; i < ats.length; i++) {
			var a = new AssessmentTask();
			ats[i].offering = {};
			ats[i].offering.id = this.getId();
			a.setData(ats[i]);
			AssessmentTask.cache[a.getId()] = a; 
		}
		
		var tts = data.series;
		for (var i = 0; i < tts.length; i++) {
			var s = new TimetableSeries();
			tts[i].offering = {};
			tts[i].offering.id = this.getId();
			s.setData(tts[i]);
			TimetableSeries.cache[s.getId()] = s;
		}
	}
});
Offering.cache = {};
Offering.get = function(id, callback) {
	Resource.get(Offering, '/offering/'+id+'.json', id, callback);
}

var AssessmentTask = Class.create(Resource, {});
AssessmentTask.cache = {};
AssessmentTask.get = function(id, callback) {
	if (AssessmentTask.cache[id])
		callback(AssessmentTask.cache[id]);
	else
		callback(null);
}

var TimetableSeries = Class.create(Resource, {
	setData: function(data) {
		$super(data);
	}
});
TimetableSeries.cache = {};
TimetableSeries.get = function(id, callback) {
	if (TimetableSeries.cache[id])
		callback(TimetableSeries.cache[id]);
	else
		callback(null);
}

Program.relations = [has_n(Plan, "plans")];
Plan.relations = [belongs_to(Program, "program"), has_n(CourseGroup, "course_groups")];
CourseGroup.relations = [belongs_to(Plan, "plan"), has_n(Course, "courses", 'code')];
Course.relations = [has_n(Course, "prereqs", 'code'), has_n(Course, "dependents", 'code'), has_n(Offering, "offerings")];
Offering.relations = [belongs_to(Course, "course"), belongs_to(Semester, "semester"), has_n(TimetableSeries, "series"), has_n(AssessmentTask, "assessment_tasks")];
AssessmentTask.relations = [belongs_to(Offering, "offering")];
TimetableSeries.relations = [belongs_to(Offering, "offering")];
