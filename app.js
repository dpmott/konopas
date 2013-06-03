
// ------------------------------------------------------------------------------------------------ utilities

function supports_localstorage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}

function read_stars() {
	var ls_stars = localStorage.getItem("c7.stars");
	return ls_stars ? JSON.parse(ls_stars) : [];
}

function toggle_star(el, id) {
	var stars = read_stars();
	if (el.classList.contains("has_star")) {
		stars = stars.filter(function(el) { return el != id; });
		el.classList.remove("has_star");
	} else {
		stars[stars.length] = id;
		el.classList.add("has_star");
	}
	stars.sort();
	localStorage.setItem("c7.stars", JSON.stringify(stars));
}

function set_page_style() {
	if (!supports_localstorage()) return;
	var style = localStorage.getItem("c7.style");
	if (style) document.body.classList.add(style);
}

function toggle_page_style() {
	if (document.body.classList.contains("black")) {
		document.body.classList.remove("black");
		if (supports_localstorage()) localStorage.setItem("c7.style", "");
	} else {
		document.body.classList.add("black");
		if (supports_localstorage()) localStorage.setItem("c7.style", "black");
	}
}

function GlobToRE(pat) {
	var re_re = new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\/-]', 'g');
	pat = pat.replace(re_re, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');

	var terms = pat.match(/"[^"]*"|'[^']*'|\S+/g).map(function(el){
		var t = '\\b' + el.replace(/^(['"])(.*)\1$/, '$2') + '\\b';
		return t; //.replace('\\b.*', '').replace('.*\\b', '');
	});

	return new RegExp(terms.join('|'), 'i');
}



// ------------------------------------------------------------------------------------------------ items

function show_info(item, id) {
	if (document.getElementById("e" + id)) return;

	var html = "";
	var a = prog.filter(function(el) { return el.id == id; });
	if (a.length < 1) html = "Program id <b>" + id + "</b> not found!";
	else {
		var ap = a[0].people.map(function(p) { return "<a href=\"#part" + p.id + "\">" + p.name + "</a>"; });
		if (ap.length > 0) html += /*"Participants: " +*/ ap.join(", ") + "\n";
		html += "<p>" + a[0].precis + "</p>";
	}
	item.innerHTML += "<div class=\"extra\" id=\"e" + id + "\">" + html + "</div>";
}

function show_prog_list(ls) {
	var list = [];
	var prev_day = "", day_str = "", prev_time = "";
	for (var i = 0; i < ls.length; ++i) {
		if (ls[i].day != prev_day) {
			prev_day = ls[i].day;
			prev_time = "";

			switch (ls[i].day) {
				case "2012-08-30": day_str = "Thursday"; break;
				case "2012-08-31": day_str = "Friday"; break;
				case "2012-09-01": day_str = "Saturday"; break;
				case "2012-09-02": day_str = "Sunday"; break;
				case "2012-09-03": day_str = "Monday"; break;
			}

			list[list.length] = '<div class="new_day">' + day_str + '</div>';
		}

		var time_str = "";
		if (ls[i].time != prev_time) {
			time_str = prev_time = ls[i].time;

			list[list.length] = '<hr /><div class="new_time" data-day="' + day_str.substr(0,3) + '">' + time_str + '</div>';
		}

		list[list.length] = '<div class="item_frame"><div class="star" id="s' + ls[i].id + '"></div>'
			+ '<div class="item" id="p' + ls[i].id + '">'
			+ '<div class="title">' + ls[i].title + '</div>'
			+ '<div class="room">' + ls[i].room + ' (' + ls[i].floor + ')</div>'
			+ '</div></div>';
	}
	document.getElementById("prog_ls").innerHTML = list.join('');

	var items = document.getElementById("prog_ls").getElementsByClassName("item");
	for (var i = 0; i < items.length; ++i) {
		items[i].onclick = function() {
			if (this.classList.contains("expanded")) {
				this.classList.remove("expanded");
			} else {
				this.classList.add("expanded");
				show_info(this, this.id.substr(1));
			}
			return true;
		};
	}

	if (supports_localstorage()) {
		var star_els = document.getElementById("prog_ls").getElementsByClassName("star");
		for (var i = 0; i < star_els.length; ++i) {
			star_els[i].onclick = function() { toggle_star(this, this.id.substr(1)); return false; };
		}

		read_stars().forEach(function(s) {
			var el = document.getElementById('s' + s);
			if (el) el.classList.add("has_star");
		});
	}
}



// ------------------------------------------------------------------------------------------------ next view

function show_next_view() {
	document.body.classList.remove("prog");
	document.body.classList.remove("part");
	document.body.classList.remove("about");
	document.body.classList.add("next");

	if (supports_localstorage()) localStorage.setItem("c7.page", "next");
}



// ------------------------------------------------------------------------------------------------ program view

function update_prog_list(day, floor, type, stars_only, freetext) {
	var re_t, re_q, re_hint, glob_hint = '', hint = '';
	switch (type) {
		case "ChiKidz":     re_t = /^ChiKidz/; break;
		case "Reading":     re_t = /Reading/; break;
		case "Autograph":   re_t = /^Autograph/; break;
		case "kk":          re_t = /^(Kaffeeklatsch|Literary Beer)/; break;
		case "filk":        re_t = /\bFilk\b/; break;
		case "other_types": re_t = /^(?!ChiKidz|Reading|Autograph|Kaffeeklatsch|Literary Beer|Themed Filk|Open Filk)./; break;
	}
	if (freetext) {
		re_q = GlobToRE(freetext); // new RegExp(freetext, "i");
		if (!freetext.match(/[?*"]/)) {
			glob_hint = freetext + '*';
			re_hint = GlobToRE(glob_hint);
		}
	}

	var star_ids = [];
	if (stars_only && supports_localstorage()) star_ids = read_stars();

	var ls = prog.filter(function(it) {
		if (star_ids.length && (star_ids.indexOf(it.id) < 0)) return false;

		if (day && it.day != day) return false;

		if (floor) switch (floor) {
			case "all floors": break;
			case "other floors": if (it.floor) return false; else break;
			default: if (it.floor != floor) return false;
		}

		if (type && re_t && !re_t.test(it.title)) return false;

		if (freetext) {
			var sa = [ it.title, it.precis, it.room ];
			for (var j = 0; j < it.people.length; ++j) sa[sa.length] = it.people[j].name;
			var sa_str = sa.join("\t");
			if (!sa_str.match(re_q)) {
				if (re_hint && !hint) {
					var r = sa_str.match(re_hint);
					if (r && r[0].match(/\S+/)) hint = r[0].match(/\S+/)[0];
				}
				return false;
			}
		}

		return true;
	});

	show_prog_list(ls);

	var dh = document.getElementById("q_hint");
	if (dh) {
		if (re_hint) {
			dh.innerHTML = "<b>Hint:</b> search is for full words, but you may also use * and ? as wildcards or \"quoted words\" for exact phrases.";
			if (hint) dh.innerHTML += " For example, "
				+ "<span href=\"#\" id=\"q_fix\" onmouseup=\"document.getElementById('q').value = '" + glob_hint + "'; prog_filter(); return true;\">"
				+ "searching for <b>" + glob_hint + "</b> would also match <b>" + hint + "</b></span>";
		} else {
			dh.innerHTML = "";
		}
	}

	if (supports_localstorage()) localStorage.setItem("c7.prog_filter", JSON.stringify([
		["day", day], ["floor", floor], ["type", type], ["stars_only", stars_only], ["freetext", freetext]
	]));
}

function update_prog_filters(day, floor, type, stars_only) {
	var dt = "d" + day;
	var dc = document.getElementById("day").getElementsByTagName("li");
	for (var i = 0; i < dc.length; ++i) {
		if (dc[i].id == dt) dc[i].classList.add("selected");
		else dc[i].classList.remove("selected");
	}

	var ft = floor ? floor.replace(/ /g, "_") : "all_floors";
	var fc = document.getElementById("floor").getElementsByTagName("li");
	for (var i = 0; i < fc.length; ++i) {
		if (fc[i].id == ft) fc[i].classList.add("selected");
		else fc[i].classList.remove("selected");
	}

	var tt = type || "all_types";
	var tc = document.getElementById("type").getElementsByTagName("li");
	for (var i = 0; i < tc.length; ++i) {
		if (tc[i].id == tt) tc[i].classList.add("selected");
		else tc[i].classList.remove("selected");
	}

	var st = stars_only ? "only_stars" : "all_stars";
	var sc = document.getElementById("stars").getElementsByTagName("li");
	for (var i = 0; i < sc.length; ++i) {
		if (sc[i].id == st) sc[i].classList.add("selected");
		else sc[i].classList.remove("selected");
	}

	var qc = document.getElementById("q");
	if (qc) {
		if (qc.value) qc.classList.add("selected");
		else qc.classList.remove("selected");
	}
}

function prog_filter(ctrl, item) {
	var day = document.getElementById("day").getElementsByClassName("selected")[0].id;
	var floor = document.getElementById("floor").getElementsByClassName("selected")[0].id;
	var type = document.getElementById("type").getElementsByClassName("selected")[0].id;
	var stars_only = document.getElementById("stars").getElementsByClassName("selected")[0].id;
	var freetext = document.getElementById("q").value;

	switch (ctrl) {
		case "day":   day = item; break;
		case "floor": floor = item; break;
		case "type":  type = item; break;
		case "stars": //stars_only = item; break;
			stars_only = item;
			if (item == "only_stars") {
				day = "d";
				floor = "all_floors";
				type = "all_types";
				freetext = document.getElementById("q").value = "";
			}
			break;
	}

	day = day.substr(1);
	floor = floor.replace(/_/g, " ");
	stars_only = (stars_only == "only_stars");

	update_prog_list(day, floor, type, stars_only, freetext);
	update_prog_filters(day, floor, type, stars_only);
}

function show_prog_view() {
	document.body.classList.remove("next");
	document.body.classList.remove("part");
	document.body.classList.remove("about");
	document.body.classList.add("prog");

	var day = "", floor = "all floors", type = "all_types", stars_only = false, freetext = "";
	var f0s = supports_localstorage() ? localStorage.getItem("c7.prog_filter") : '';
	var f0 = f0s ? JSON.parse(f0s) : [];
	for (var i = 0; i < f0.length; ++i) switch (f0[i][0]) {
		case "day": day = f0[i][1]; break;
		case "floor": floor = f0[i][1]; break;
		case "type": type = f0[i][1]; break;
		case "stars_only": stars_only = f0[i][1]; break;
		case "freetext": freetext = document.getElementById("q").value = f0[i][1]; break;
	}

	update_prog_list(day, floor, type, stars_only, freetext);
	update_prog_filters(day, floor, type, stars_only);

	if (supports_localstorage()) localStorage.setItem("c7.page", "prog");
}



// ------------------------------------------------------------------------------------------------ participant view

function update_part_view(name_sort, first_letter, participant) {
	if (name_sort == "sort_first") {
		document.getElementById("sort_first").classList.add("selected");
		document.getElementById("sort_last").classList.remove("selected");
	} else {
		document.getElementById("sort_first").classList.remove("selected");
		document.getElementById("sort_last").classList.add("selected");
	}

	var ll = document.getElementById("first_letter").getElementsByTagName("li");
	for (var i = 0; i < ll.length; ++i) {
		if (ll[i].innerHTML == first_letter) ll[i].classList.add("selected");
		else ll[i].classList.remove("selected");
	}


	var p_id = participant.substr(1);
	var pa = people.filter(function(p) { return p.id == p_id; });
	if (!pa.length) {
		participant = '';

		var lp = people.filter(function(p) { return ((name_sort == 'sort_first') ? p.first : p.last)[0] == first_letter });
		if (name_sort == 'sort_first') lp.sort(function(a, b) {
			var an = (a.first + '  ' + a.last).toLowerCase();
			var bn = (b.first + '  ' + b.last).toLowerCase();
				 if (an < bn) return -1;
			else if (an > bn) return 1;
			else              return 0;
		});

		document.getElementById("part_names").innerHTML = lp.map(function(p) {
			return '<li id="p' + p.id + '"><span class="fn">' + p.first + '</span> ' + p.last + '</li>';
		}).join('');
		document.getElementById("part_info").innerHTML = "";
		document.getElementById("prog_ls").innerHTML = "";

		var pc = document.getElementById("part_names").getElementsByTagName("li");
		for (var i = 0; i < pc.length; ++i) {
			pc[i].onclick = function() { part_filter(this.parentNode.id, this); return true; };
		}
	} else {
		document.getElementById("part_names").innerHTML = "";
		document.getElementById("part_info").innerHTML = '<h1 id="part_title">' + pa[0].first + ' ' + pa[0].last + '</h1><p>' + pa[0].bio + '</p>';
		show_prog_list(prog.filter(function(it) { return pa[0].program.indexOf(it.id) >= 0; }));

		document.getElementById("part_title").scrollIntoView();
	}


	if (supports_localstorage()) localStorage.setItem("c7.part_filter", JSON.stringify([
		["name_sort", name_sort], ["first_letter", first_letter], ["participant", participant]
	]));
}

function part_filter(ctrl, el) {
	var name_sort = document.getElementById("name_sort").getElementsByClassName("selected")[0].id;
	var first_letter = document.getElementById("first_letter").getElementsByClassName("selected")[0].innerHTML;
	var participant = "";

	switch (ctrl) {
		case "name_sort":    name_sort = el.id; break;
		case "first_letter": first_letter = el.innerHTML; break;
		case "part_names":   participant = el.id; break;
	}

	update_part_view(name_sort, first_letter, participant);
}

function show_part_view() {
	document.body.classList.remove("next");
	document.body.classList.remove("prog");
	document.body.classList.remove("about");
	document.body.classList.add("part");

	var name_sort = "sort_last", first_letter = "A", participant = "";
	var f0s = supports_localstorage() ? localStorage.getItem("c7.part_filter") : '';
	var f0 = f0s ? JSON.parse(f0s) : [];
	for (var i = 0; i < f0.length; ++i) switch (f0[i][0]) {
		case "name_sort":    name_sort = f0[i][1]; break;
		case "first_letter": first_letter = f0[i][1]; break;
		case "participant":  participant = f0[i][1]; break;
	}

	update_part_view(name_sort, first_letter, participant);

	if (supports_localstorage()) localStorage.setItem("c7.page", "part");
}



// ------------------------------------------------------------------------------------------------ about view

function show_about_view() {
	document.body.classList.remove("next");
	document.body.classList.remove("prog");
	document.body.classList.remove("part");
	document.body.classList.add("about");

	document.getElementById("prog_ls").innerHTML = "";

	if (supports_localstorage()) localStorage.setItem("c7.page", "about");
}



// ------------------------------------------------------------------------------------------------ init

// page style
set_page_style();
var os = document.getElementById("opt_style");
if (os) os.onclick = toggle_page_style;


// init tab menu
document.getElementById("tab_next").onclick = show_next_view;
document.getElementById("tab_prog").onclick = show_prog_view;
document.getElementById("tab_part").onclick = show_part_view;
document.getElementById("tab_about").onclick = show_about_view;


// init prog view
var dc = document.getElementById("prog_filters").getElementsByTagName("li");
for (var i = 0; i < dc.length; ++i) {
	dc[i].onclick = function() { prog_filter(this.parentNode.id, this.id); return true; };
}
var sf = document.getElementById("search");
if (sf) {
	sf.onsubmit = function() { prog_filter(); return false; };
	sf.onreset = function() { document.getElementById("q").value = ""; prog_filter(); return true; };
}
document.getElementById("q").onblur = prog_filter;


// init part view
var pc = document.getElementById("part_filters").getElementsByTagName("li");
for (var i = 0; i < pc.length; ++i) {
	pc[i].onclick = function() { part_filter(this.parentNode.id, this); return true; };
}


// set up fixed time display
var prev_scroll = { "i": 0, "top": 0 };
var n = 0;
window.onscroll = function() {
	var st = (document.body.scrollTop || document.documentElement.scrollTop) + 20;
	var te = document.getElementById("top"); if (!te) return;
	var tl = document.getElementsByClassName("new_time"); if (!tl) return;
	//var i = 1; while ((i < tl.length) && (tl[i].offsetTop < st)) ++i; --i;
	var i = prev_scroll.top ? prev_scroll.i : 1;
	if (i >= tl.length) i = tl.length - 1;
	if (st > tl[i].offsetTop) {
		while ((i < tl.length) && (st > tl[i].offsetTop)) ++i;
		--i;
	} else {
		while ((i >= 0) && (st < tl[i].offsetTop)) --i;
	}
	if (i < 0) i = 0;

	prev_scroll.i = i;
	prev_scroll.top = tl[i].offsetTop;
	te.innerHTML = tl[i].getAttribute("data-day") + "<br />" + tl[i].innerHTML;
};


var init_page = supports_localstorage() ? localStorage.getItem("c7.page") : '';
switch (init_page) {
	case 'next':   show_next_view(); break;
	case 'part':  show_part_view(); break;
	case 'about': show_about_view(); break;
	case 'prog':
	default:      show_prog_view();
}
