//= require <prototype>

var ScrollFollower = Class.create({
	initialize: function(opts) {
		if (opts && opts.target) {
			this.setTarget(opts.target);
		}
		
		document.observe('scroll', this.on_documentScrolled.bind(this));
	},
	
	on_documentScrolled: function(evt) {
		if (!this.target) return;
		
		var so = document.viewport.getScrollOffsets();
		if (so.top >= this.coff.top)
			this.target.style.top = (so.top - this.coff.top + 10) + 'px';
		else
			this.target.style.top = '0px';
	},
	
	setTarget: function(target) {
		this.target = target;
		this.coff = target.cumulativeOffset();
	}
});
