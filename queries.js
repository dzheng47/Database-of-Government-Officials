// 1. List all U.S. presidents with their full names and party affiliation.
db.executives.find( { "terms.type": "prez" },
    { "name.first": 1, "name.last": 1, "terms.party": 1, _id: 0 } 
);

//2. List all unique parties represented by legislators.

db.legislators.distinct("terms.party");

// 3. Count the total number of U.S. presidents who were elected without party affiliation (party:
//"no party"), also display their names.
db.executives.aggregate(
    { $match: { "terms.type": "prez", "terms.party": "no party" } },
    { $project: { "name.first": 1, "name.last": 1, "_id": 0}},
);
    //Unfinished and need help also adding in count. Can't seem to get both to work at the same time.

// 4. Identify the longest serving female legislator.

//5. List all presidents who came to power through succession.
db.executives.aggregate([
    { $unwind: "$terms" }, 
    { $match: { "terms.type": "prez", "terms.how": "succession" } }, 
    { $project: { "name.first": 1, "name.last": 1, "terms.party": 1, "_id": 0 } } 
  ]);
  
//6. List presidents and vice presidents grouped by party affiliation.
db.executives.aggregate(
    { $project: { "name.first": 1, "name.last": 1, "terms.type": 1, "terms.party":1, "_id": 0}},
    { $sort:{"terms.party":1}}
);

//7. List all legislators who served in both the house and the senate.
db.legislators.aggregate(
    { $match: { $and:[{"terms.type": "sen"}, {"terms.type": "rep"} ]} },
    { $project: { "name.first": 1, "name.last": 1, "_id": 0}}, 
); 
//8. Count the number of terms served by each party across all presidents and vice presidents.
db.executives.aggregate([
    { $unwind: "$terms" },
    {"$group" : {_id:"$terms.party", count:{$sum:1}}}
  ]);
//9. List vice presidents who were appointed rather than elected.
db.executives.find(
    { "terms.type": "viceprez", "terms.how": "appointment" },
{ "name.first": 1, "name.last": 1, "terms.how": 1, _id: 0 }
  );
  

//10. Identify legislators who did not serve in Congress and later became U.S. presidents.
db.executives.find(
    { "terms.type": "prez", "terms.how": "election" },
    { "name.first": 1, "name.last": 1, "terms.how": 1, _id: 0 }
  );
  

//11. Calculate the average duration of presidential terms by party.

//12. Calculate the total number of years served by each vice president in office.
//13. List legislators who served in Congress during a vice president’s term and shared the same
//party affiliation.
//14. List presidents who had overlapping terms with legislators in the same state.
//15. Identify all presidents and vice presidents who served terms under the same party affiliation/
//in both roles.
