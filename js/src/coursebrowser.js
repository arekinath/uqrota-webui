//= require <MoreInfoPanel>
//= require <CourseSearchResults>
//= require <CourseBrowser>
//= require <API>
//= require <SemesterBrowser>
//= require <LoginBoxView>

document.observe("dom:loaded", function () {
	var lbv = new LoginBoxView($('loginbox'));	
	
	var coff = $('leftcolumn').cumulativeOffset();
	document.observe('scroll', function(evt) {
		var so = document.viewport.getScrollOffsets();
		if (so.top >= coff.top)
			$('leftcolumn').style.top = (so.top - coff.top + 10) + 'px';
		else
			$('leftcolumn').style.top = '0px';
	});
	
	API.checkLogin(function (status) {
		if (!status) {
			window.location.href = '/index.html';
		} else {
			MoreInfoPanel.instance = new MoreInfoPanel($('moreInfoPanel'));
			var cbModel = new CourseSearchResults();
			var cb = new CourseBrowser($('searchEdit'), $('searchResultsPanel'), cbModel);
			
			var sb = new SemesterBrowser($('boxPanel'), $('main'));
			$('searchEdit').value = '';
			$('searchEdit').focus();
		}
	});
});