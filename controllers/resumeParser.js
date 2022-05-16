const express = require('express');
const router = express.Router();
const { affindaClient, firebaseStorage, database } = require("./initializer");
const fs = require("fs");
const { async } = require('@firebase/util');
const { ResumeSearchParametersSkillsItem } = require("@affinda/affinda")
const excel = require("excel4node");
const { log } = require('console');
// MRF
/**
 * Creates a resume search using bases resume data
 * @param {*} res: Response object to request
 * @param {*} basesResumeData: Bases resume data
 * 
 */
//  jobDescription?: string;
//  jobTitles?: string[];
//  jobTitlesCurrentOnly?: boolean;
//  jobTitlesRequired?: boolean;
//  jobTitlesWeight?: number;
//  yearsExperienceMin?: number;
//  yearsExperienceMax?: number;
//  yearsExperienceRequired?: boolean;
//  yearsExperienceWeight?: number;
//  locations?: ResumeSearchParametersLocationsItem[];
//  locationsWeight?: number;
//  locationsRequired?: boolean;
//  skills?: ResumeSearchParametersSkillsItem[];
//  skillsWeight?: number;
//  languages?: ResumeSearchParametersLanguagesItem[];
//  languagesWeight?: number;
//  institutions?: string[];
//  institutionsRequired?: boolean;
//  degrees?: string[];
//  degreesRequired?: boolean;
//  highestDegreeTypes?: (EducationLevel | null)[];
//  highestDegreeTypesRequired?: boolean;
//  isCurrentStudent?: boolean;
//  isCurrentStudentRequired?: boolean;
//  isRecentGraduate?: boolean;
//  isRecentGraduateRequired?: boolean;
//  educationWeight?: number;
//  searchExpression?: string;
//  searchExpressionRequired?: boolean;
//  searchExpressionWeight?: number;
//  socCodes?: number[];
//  socCodesWeight?: number;
//  socCodesRequired?: boolean;
//  managementLevel?: ManagementLevel;
//  managementLevelRequired?: boolean;
//  managementLevelWeight?: number;
let searchResume = async (res, owner, mrfName) => {
    // let properties = {
    //     indices: ["All Resumes"],
    //     jobTitles: ["Software Engineering", "Student Consultant", "Research Assistant", "Developer"],
    //     yearsExperienceMin: 1,
    //     yearsExperienceMax: 5,
    //     degrees: ["Bachelor", "Master"],
    //     skills: [
    //         {
    //             name: "Testing",
    //             required: true
    //         },
    //         {
    //             name: "Management",
    //             required: true
    //         }
    //     ],
    //     managementLevel: "Low",
    //     languages:[
    //         {
    //             name: "English",
    //             required: true
    //         }
    //     ]
    //     // institutions: [],
    // }

    await database.ref().child("MRFs").child(owner).get()
    .then( async dataSnapshot => {
        let jsonData = dataSnapshot.toJSON();
        console.log(jsonData);
        let properties = {};

        // getting mrf values
        Object.keys(jsonData).forEach(key => {
            if (jsonData[key]["mrfName"].toLowerCase() === mrfName.toLowerCase()){
                properties = jsonData[key];
            }
        });
        
        console.log(properties);

        // processing values
        let createObjects = (elements) => {
            let listOfObjects = [];
            
            elements.forEach(element => {
                listOfObjects.push({ name: element, required: true });
            });
            return listOfObjects;
        }
        properties.languages = createObjects(properties.languages.split(","));
        properties.skills = createObjects(properties.skills.split(","));
        properties.jobTitles = properties.jobTitles.split(",");
        properties.degrees = properties.degrees.split(",");
        properties.indices = ["All Resumes"];

        console.log(properties);
        await affindaClient.createResumeSearch(properties).then( resumeSearch => {
            res.json(resumeSearch);
            affindaClient.getAllResumes().then( resumes => {
                resumes.results.forEach(resume => {
                    affindaClient.deleteResume(resume.identifier)
                });
            }).catch( error => console.error(error));
        }).catch( error => console.error(error));
    }).catch( error => console.error(error));

    
}
/**
 * Uploads all resumes for searching
 * @param {*} res: Response object to request
 * @param {*} basesResumeData: Bases resume data
 * @param {*} folderName: Folder name containing resumes to be reveiwed
 */
let uploadResumesForReview = async (res, folderName, owner, mrfName) => {
    // get download url of each resume
    await firebaseStorage.bucket().getFiles({ prefix: `ResumesFolder/${ folderName }/`}, (error, files) => {
        if (error) throw error;

        // checking whether there are no resumes in the specified path
        if (files.length === 0){
            res.json({ status: 404, message: "No resumes found in the specified directory."});
        }else{
            let fileNames = [];

            // gathering all resume urls
            Promise.all(
                files.map( file => {
                    if (["application/pdf", 
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
                    .includes(file.metadata.contentType)){
                        let fileName = file.metadata.name.split("/").reverse()[0];
                        fileNames.push(fileName);
                        return file.getSignedUrl({
                            expires: "01-01-2025",
                            action: "read"
                        });
                    }
                })
            ).then( files => {
                
                // removing all undefined from files url list
                files = files.filter( file => file !== undefined );

                // creating resumes on affinda
                let createResumePromises = [];
                let count = 0;

                fileNames.forEach( fileName => {
                    createResumePromises.push(affindaClient.createResume({ url: files[count++][0], fileName: fileName }));
                });

                Promise.all(createResumePromises)
                .then( resumes => {
                    // console.log(resumes);

                    // searching resumes
                    searchResume(res, owner, mrfName);
                }).catch( error => console.error(error));
            }).catch( error => console.error(error));
        }
    });
}

/**
 * - Parses resumes and stores the obtained data in csv format.
 * - This api receives post requests with the body containing 
 * - The folder name where the resumes are stored.
 * - The resumes are read, parsed and the result is stored in a folder with
 * the same name but under CSVs.
 */
router.post('/', async (req, res) => {
    // folder name
    let folderName = req.body.folderName;
    let mrfName = req.body.mrfName;
    let owner = req.body.owner;

    console.log(req.body);

    uploadResumesForReview(res, folderName, owner, mrfName);

    // // get bases resume
    // await firebaseStorage.bucket().getFiles({ prefix: `${ bases }/`}, 
    // (error, files) => {
    //     console.log(files.length);
    //     let basesResume = files[1];
    //     let basesFileName = basesResume.metadata.name.split("/").reverse()[0];

    //     // getting bases resume url
    //     basesResume.getSignedUrl({
    //         expires: "01-01-2025",
    //         action: "read"
    //     }, (error, url) => {
    //         if (error) throw error;

    //         // uploading resume
    //         affindaClient.createResume({ url: url, fileName: basesFileName })
    //         .then( resume => {
    //             // delete bases resume
    //             affindaClient.deleteResume(resume.meta.identifier)
    //             .then( error => {
    //                 if (error.body) throw error;

    //                 // upload resumes for review
    //                 uploadResumesForReview(res, folderName, owner, mrfName);
    //             }).catch( error => console.error(error));
    //         }).catch( error => console.error(error));
    //     });
    // });
});

module.exports = router;
