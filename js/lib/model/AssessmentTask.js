//= require <Model>
//= require <Resource>

Model.AssessmentTask = Resource.make({
	relations: [
		belongs_to('offering')
	]
});