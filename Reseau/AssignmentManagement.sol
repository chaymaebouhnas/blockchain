// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AssignmentManagement {
    
    // Structures de données
    struct Assignment {
        uint256 id;
        address teacher;
        string title;
        string description;
        string publicKey; // Clé publique RSA de l'enseignant
        uint256 deadline;
        uint256 createdAt;
        bool isActive;
    }
    
    struct Submission {
        uint256 assignmentId;
        address student;
        string encryptedAnswer; // Réponse chiffrée avec RSA
        string studentInfo; // Informations d'identité chiffrées
        uint256 submittedAt;
        bool isGraded;
    }
    
    struct Grade {
        uint256 submissionId;
        uint256 assignmentId;
        address student;
        uint256 grade;
        string encryptedFeedback; // Feedback chiffré pour l'étudiant
        uint256 gradedAt;
    }
    
    struct Announcement {
        uint256 id;
        address teacher;
        string title;
        string content;
        uint256 createdAt;
    }
    
    // Mappings
    mapping(uint256 => Assignment) public assignments;
    mapping(uint256 => Submission) public submissions;
    mapping(uint256 => Grade) public grades;
    mapping(uint256 => Announcement) public announcements;
    
    // Mappings pour les relations
    mapping(address => bool) public isTeacher;
    mapping(address => bool) public isStudent;
    mapping(uint256 => uint256[]) public assignmentSubmissions; // assignmentId => submissionIds
    mapping(address => uint256[]) public studentSubmissions; // student => submissionIds
    
    // Compteurs
    uint256 public assignmentCounter;
    uint256 public submissionCounter;
    uint256 public gradeCounter;
    uint256 public announcementCounter;
    
    // Événements
    event TeacherRegistered(address indexed teacher, uint256 timestamp);
    event StudentRegistered(address indexed student, uint256 timestamp);
    
    event AssignmentCreated(
        uint256 indexed assignmentId,
        address indexed teacher,
        string title,
        uint256 deadline,
        uint256 timestamp
    );
    
    event SubmissionCreated(
        uint256 indexed submissionId,
        uint256 indexed assignmentId,
        address indexed student,
        uint256 timestamp
    );
    
    event GradeAssigned(
        uint256 indexed gradeId,
        uint256 indexed assignmentId,
        address indexed student,
        uint256 grade,
        uint256 timestamp
    );
    
    event AnnouncementCreated(
        uint256 indexed announcementId,
        address indexed teacher,
        string title,
        uint256 timestamp
    );
    
    // Modificateurs
    modifier onlyTeacher() {
        require(isTeacher[msg.sender], "Only teachers can perform this action");
        _;
    }
    
    modifier onlyStudent() {
        require(isStudent[msg.sender], "Only students can perform this action");
        _;
    }
    
    // Fonctions d'enregistrement
    function registerAsTeacher() external {
        require(!isTeacher[msg.sender], "Already registered as teacher");
        require(!isStudent[msg.sender], "Cannot be both teacher and student");
        
        isTeacher[msg.sender] = true;
        emit TeacherRegistered(msg.sender, block.timestamp);
    }
    
    function registerAsStudent() external {
        require(!isStudent[msg.sender], "Already registered as student");
        require(!isTeacher[msg.sender], "Cannot be both teacher and student");
        
        isStudent[msg.sender] = true;
        emit StudentRegistered(msg.sender, block.timestamp);
    }
    
    // Module 1: Attribution des devoirs
    function createAssignment(
        string memory _title,
        string memory _description,
        string memory _publicKey,
        uint256 _deadline
    ) external onlyTeacher returns (uint256) {
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        
        assignmentCounter++;
        
        assignments[assignmentCounter] = Assignment({
            id: assignmentCounter,
            teacher: msg.sender,
            title: _title,
            description: _description,
            publicKey: _publicKey,
            deadline: _deadline,
            createdAt: block.timestamp,
            isActive: true
        });
        
        emit AssignmentCreated(
            assignmentCounter,
            msg.sender,
            _title,
            _deadline,
            block.timestamp
        );
        
        return assignmentCounter;
    }
    
    // Module 2: Remise des devoirs (chiffrés)
    function submitAssignment(
        uint256 _assignmentId,
        string memory _encryptedAnswer,
        string memory _studentInfo
    ) external onlyStudent returns (uint256) {
        require(assignments[_assignmentId].isActive, "Assignment is not active");
        require(
            block.timestamp <= assignments[_assignmentId].deadline,
            "Assignment deadline has passed"
        );
        require(bytes(_encryptedAnswer).length > 0, "Answer cannot be empty");
        require(bytes(_studentInfo).length > 0, "Student info cannot be empty");
        
        submissionCounter++;
        
        submissions[submissionCounter] = Submission({
            assignmentId: _assignmentId,
            student: msg.sender,
            encryptedAnswer: _encryptedAnswer,
            studentInfo: _studentInfo,
            submittedAt: block.timestamp,
            isGraded: false
        });
        
        assignmentSubmissions[_assignmentId].push(submissionCounter);
        studentSubmissions[msg.sender].push(submissionCounter);
        
        emit SubmissionCreated(
            submissionCounter,
            _assignmentId,
            msg.sender,
            block.timestamp
        );
        
        return submissionCounter;
    }
    
    // Module 3: Envoi des résultats aux étudiants
    function gradeSubmission(
        uint256 _submissionId,
        uint256 _grade,
        string memory _encryptedFeedback
    ) external onlyTeacher returns (uint256) {
        Submission storage submission = submissions[_submissionId];
        require(submission.submittedAt > 0, "Submission does not exist");
        require(!submission.isGraded, "Submission already graded");
        require(
            assignments[submission.assignmentId].teacher == msg.sender,
            "Only the assignment teacher can grade"
        );
        require(_grade <= 100, "Grade must be between 0 and 100");
        
        gradeCounter++;
        
        grades[gradeCounter] = Grade({
            submissionId: _submissionId,
            assignmentId: submission.assignmentId,
            student: submission.student,
            grade: _grade,
            encryptedFeedback: _encryptedFeedback,
            gradedAt: block.timestamp
        });
        
        submission.isGraded = true;
        
        emit GradeAssigned(
            gradeCounter,
            submission.assignmentId,
            submission.student,
            _grade,
            block.timestamp
        );
        
        return gradeCounter;
    }
    
    // Module 4: Annonce des informations
    function createAnnouncement(
        string memory _title,
        string memory _content
    ) external onlyTeacher returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_content).length > 0, "Content cannot be empty");
        
        announcementCounter++;
        
        announcements[announcementCounter] = Announcement({
            id: announcementCounter,
            teacher: msg.sender,
            title: _title,
            content: _content,
            createdAt: block.timestamp
        });
        
        emit AnnouncementCreated(
            announcementCounter,
            msg.sender,
            _title,
            block.timestamp
        );
        
        return announcementCounter;
    }
    
    // Fonctions de lecture
    function getAssignment(uint256 _assignmentId) 
        external 
        view 
        returns (Assignment memory) 
    {
        return assignments[_assignmentId];
    }
    
    function getSubmission(uint256 _submissionId) 
        external 
        view 
        returns (Submission memory) 
    {
        return submissions[_submissionId];
    }
    
    function getGrade(uint256 _gradeId) 
        external 
        view 
        returns (Grade memory) 
    {
        return grades[_gradeId];
    }
    
    function getAnnouncement(uint256 _announcementId) 
        external 
        view 
        returns (Announcement memory) 
    {
        return announcements[_announcementId];
    }
    
    function getAssignmentSubmissions(uint256 _assignmentId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return assignmentSubmissions[_assignmentId];
    }
    
    function getStudentSubmissions(address _student) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return studentSubmissions[_student];
    }
    
    function getAllAssignments() 
        external 
        view 
        returns (Assignment[] memory) 
    {
        Assignment[] memory allAssignments = new Assignment[](assignmentCounter);
        for (uint256 i = 1; i <= assignmentCounter; i++) {
            allAssignments[i - 1] = assignments[i];
        }
        return allAssignments;
    }
    
    function getAllAnnouncements() 
        external 
        view 
        returns (Announcement[] memory) 
    {
        Announcement[] memory allAnnouncements = new Announcement[](announcementCounter);
        for (uint256 i = 1; i <= announcementCounter; i++) {
            allAnnouncements[i - 1] = announcements[i];
        }
        return allAnnouncements;
    }
    
    // Fonction utilitaire pour vérifier le rôle
    function getUserRole(address _user) 
        external 
        view 
        returns (string memory) 
    {
        if (isTeacher[_user]) return "teacher";
        if (isStudent[_user]) return "student";
        return "none";
    }
}