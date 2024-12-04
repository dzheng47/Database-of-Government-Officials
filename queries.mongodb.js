use("project2");
// 1. List all U.S. presidents with their full names and party affiliation.
db.executives.find( { "terms.type": "prez" },
    { "name.first": 1, "name.last": 1, "terms.party": 1, "_id": 0 } 
);

//2. List all unique parties represented by legislators.

db.legislators.distinct("terms.party");

// 3. Count the total number of U.S. presidents who were elected without party affiliation (party:
//"no party"), also display their names.
db.executives.aggregate(
  { $match: { "terms.type": "prez", "terms.party": "no party" } },
  { $facet:{
    "Count":[{$count: 'total'}],
    "List": [{$project:{"name.first": 1, "name.last": 1, "_id": 0}}]
  }}
);

// 4. Identify the longest serving female legislator.
db.legislators.aggregate(
  { $unwind: "$terms" },
  { $match: { "terms.type": "sen", "bio.gender": "F" } },
  { $group: { "_id": "$id.bioguide", 
              "total_time": {
                  $sum: {
                    $dateDiff:{
                      startDate:{$dateFromString:{dateString: "$terms.start"}}, 
                      endDate:{ $dateFromString:{dateString: "$terms.end"}}, 
                      unit:"day"
                    }
                  }
                }
            }
  },
  { $sort: { "total_time": -1 } },
  { $limit: 1 },
  { $lookup: {
              from: "legislators",
              localField: "_id",
              foreignField: "id.bioguide",
              as: "longest"
              }
  },
  { $project: {"longest.name.first": 1, "longest.name.last": 1, "_id": 0}}
);

//5. List all presidents who came to power through succession.
db.executives.aggregate([
    { $unwind: "$terms" }, 
    { $match: { "terms.type": "prez", "terms.how": "succession" } }, 
    { $project: { "name.first": 1, "name.last": 1, "terms.party": 1, "_id": 0 } } 
  ]);
  
//6. List presidents and vice presidents grouped by party affiliation.
db.executives.aggregate([
  {$unwind: "$terms"},
  {$group: {"_id": "$terms.party",
            "Name": {$addToSet: { "First Name": "$name.first", 
                                 "Last Name": "$name.last"
                               }
                   }
          }
  }
]);

//7. List all legislators who served in both the house and the senate.
db.legislators.aggregate(
    { $match: { $and:[{"terms.type": "sen"}, {"terms.type": "rep"} ]} },
    { $project: { "name.first": 1, "name.last": 1, "_id": 0}}, 
); 
//8. Count the number of terms served by each party across all presidents and vice presidents.
db.executives.aggregate([
  { $unwind: "$terms" },
  { $group : {_id:"$terms.party", count:{$sum:1}}}
]);

//9. List vice presidents who were appointed rather than elected.
db.executives.find(
  { "terms.type": "viceprez", "terms.how": "appointment" },
  { "name.first": 1, "name.last": 1, "terms.how": 1, "_id": 0 }
);

//10. Identify legislators who did not serve in Congress and later became U.S. presidents.
db.executives.aggregate([
  { $lookup: {
    from: "legislators",
    localField: "id.bioguide",
    foreignField: "id.bioguide",
    as: "references"
  }},
  { $match:{references:[], "terms.type":"prez"}},
  { $project: {
    "name.first": 1, "name.last": 1, "_id": 0
  }}
]);

//11. Calculate the average duration of presidential terms by party.
db.executives.aggregate([
  { $unwind: "$terms" },
  { $match: {"terms.type":"prez"}},
  { $group : {_id:"$terms.party", "Average Duration (Days)":{
    $avg:{
      $dateDiff:{
        startDate:{$dateFromString:{dateString: "$terms.start"}}, 
        endDate:{ $dateFromString:{dateString: "$terms.end"}}, 
        unit:"day"
      }}}}}
]);
//12. Calculate the total number of years served by each vice president in office.
db.executives.aggregate([
  { $unwind: "$terms" },
  { $match: {"terms.type":"viceprez"}},
  { $group : {_id:{"first name":"$name.first", "last name":"$name.last"}, "Total Duration (Year)":{
    $sum:{
      $dateDiff:{
        startDate:{$dateFromString:{dateString: "$terms.start"}}, 
        endDate:{ $dateFromString:{dateString: "$terms.end"}}, 
        unit:"year"
      }}}}}
]);
//13. List legislators who served in Congress during a vice president’s term and shared the same
//party affiliation.
db.legislators.aggregate([
  {$unwind: "$terms"},
  {$lookup: {from: "executives",
      localField:"terms.party",
      foreignField:"terms.party",
      let: {legislator_terms: "$terms", legislator_party: "$terms.party"},
             pipeline: [
              {$unwind: "$terms"},
              {$match: {$expr: {$eq: ["$terms.type", "viceprez"]}}},
              {$addFields: { vp_start: { $dateFromString: { dateString: "$terms.start" } },
                             vp_end: { $dateFromString: { dateString: "$terms.end" } }
                           }
              },
              {$addFields: { legislator_start: { $dateFromString: { dateString: "$$legislator_terms.start" } },
                             legislator_end: { $dateFromString: { dateString: "$$legislator_terms.end" } }
                           }
              },
              {$match: { $expr: { $or: [{$and: [ { $gte: [ "$legislator_start", "$vp_start" ] },
                                               { $lte: [ "$legislator_start", "$vp_end" ] }
                                             ]
                                        },
                                        {$and: [ { $gte: [ "$vp_start", "$legislator_start" ] },
                                                { $lte: [ "$vp_start", "$legislator_end" ] }
                                            ]
                                        }]
                              }
                       }
              }
              // {$match: {$expr: {$eq: ["$terms.party", "legislator_party"]}}},      //CANNOT ACCESS legislator party
              
             ],
             as: "matched_party"
          },
  },
    //Lookup to get name of legislators?
    {$project: {"name.first":1, "name.last":1, "_id":0}}
]);

//14. List presidents who had overlapping terms with legislators in the same state.
db.executives.aggregate([
  {$unwind: "$terms"},
  {$match: {"terms.type":"pres"}},
  {$lookup: {from: "legislators",
      let: {pres_terms: "$terms"},
             pipeline: [
              {$unwind: "$terms"},
              {$addFields: { pres_start: { $dateFromString: { dateString: "$pres_terms.start" } },
                             pres_end: { $dateFromString: { dateString: "$pres_terms.end" } }
                           }
              },
              {$addFields: { legislator_start: { $dateFromString: { dateString: "$terms.start" } },
                             legislator_end: { $dateFromString: { dateString: "$terms.end" } }
                           }
              },
              {$match: { $expr: { $and: [ { $eq: [ "$pres_start", "$legislator_start" ] },
                                          { $eq: [ "$pres_end", "$legislator_end" ] }
                                        ]
                                }
                       }
              }
             ],
             as: "overlap"
          },
  },
    {$project: {"name.first":1, "name.last":1, "_id":0}}
]);
//15. Identify all presidents and vice presidents who served terms under the same party affiliation
//in both roles.
db.executives.aggregate([
  {$unwind: "$terms"},
  {$group: {"_id": {"exec_id": "$id.bioguide", "party": "$terms.party"},
            "first_name": {$first: "$name.first"},
            "last_name": {$first: "$name.last"},
            "roles": {$push: "$terms.type"} 
           }
  },
  {$match: {"roles": {$all: ["prez", "viceprez"]}}},
  {$project: {"first_name":1, "last_name":1, "_id.party":1}}
]);
