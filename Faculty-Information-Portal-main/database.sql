CREATE DATABASE FacultyDB;

-- \c todo_database 

CREATE TABLE Faculty(
    FacID INT PRIMARY KEY NOT NULL,
    FacName VARCHAR(255),
    Dept VARCHAR(30),
    Desig VARCHAR(50),
    Pid INT,
    Role VARCHAR(50),
    Email VARCHAR(255),
    Joining_Date DATE,
    ws INT,
    Pswd VARCHAR(255),
    TNOL INT
);

CREATE TABLE Track_of_ID(
    FacID INT,
    AppID INT,
    HireID INT,
    CommentID INT
);

CREATE TABLE ProjData(
    Pid INT PRIMARY KEY,
    PI INT
);

    CREATE TABLE LeaveApp(
        FacID INT NOT NULL,
        AppID INT PRIMARY KEY,
        Title VARCHAR(255),
        Retro INT,
        StartDate DATE,
        NOD INT,
        Content VARCHAR(1000),
        AppStatus INT
    );

    CREATE TABLE HireApp(
        FacID INT NOT NULL,
        HireID INT PRIMARY KEY,
        Title VARCHAR(255),
        type VARCHAR(4),
        Pid INT,
        Duration INT,
        Content VARCHAR(1000),
        status INT
    );

    CREATE TABLE Instruc(
        PI INT,
        PendingApp INT,
        AppStatus INT
    );

    CREATE TABLE DSA(
        PendingApp INT PRIMARY KEY,
        AppStatus INT 
    );

    CREATE TABLE HOD_CS(
        PendingApp INT PRIMARY KEY,
        AppStatus INT 
    );

    CREATE TABLE HOD_EE(
        PendingApp INT PRIMARY KEY,
        AppStatus INT 
    );

    CREATE TABLE HOD_ME(
        PendingApp INT PRIMARY KEY,
        AppStatus INT 
    );

    CREATE TABLE HOD_CE(
        PendingApp INT PRIMARY KEY,
        AppStatus INT
    );

    CREATE TABLE DFA(
        PendingApp INT PRIMARY KEY,
        AppStatus INT
    );

    CREATE TABLE Director(
        PendingApp INT PRIMARY KEY,
        AppStatus INT
    );

    CREATE TABLE Comments(
        AppID INT,
        SendById INT,
        SendToId INT,
        Content VARCHAR(1000),
        CommentID INT
    );






DROP TABLE LeaveApp;
DROP TABLE HireApp;
DROP TABLE Instruc;
DROP TABLE Comments;
DROP TABLE Director;
DROP TABLE DFA;
DROP TABLE DSA;
DROP TABLE HOD_CS;
DROP TABLE HOD_EE;
DROP TABLE HOD_ME;
DROP TABLE HOD_CE;

--------------------------------------------------------- STORED PROCEDURES ------------------------------------------------------

create or replace function store_leaveApp(IN Id INT, IN AppId INT)
RETURNS VOID AS $$
DECLARE
	Dt VARCHAR(30);
    Desg VARCHAR(50);
BEGIN

    SELECT dept INTO Dt FROM Faculty WHERE facid=Id ;
    SELECT desig INTO Desg FROM Faculty WHERE facid=Id;

    IF Desg='Faculty' THEN 
        IF Dt='Computer Science' THEN INSERT INTO HOD_CS (PendingApp) VALUES (AppId);
        ELSEIF Dt='Electrical' THEN INSERT INTO HOD_EE (PendingApp) VALUES (AppId);
        ELSEIF Dt='Mechanical' THEN INSERT INTO HOD_ME (PendingApp) VALUES (AppId);
        ELSEIF Dt='Civil' THEN INSERT INTO HOD_CE (PendingApp) VALUES (AppId);
        END IF;
    ELSE
        INSERT INTO Director (PendingApp) VALUES (AppId);
    END IF;

END;
$$ LANGUAGE plpgsql;

-----------------------------------------------------------------------------------------------------------



create or replace function return_data(IN fid INT)
RETURNS TABLE AS $$
DECLARE
	aid INT;
    Dt VARCHAR(30);
    design VARCHAR(50);
    CREATE TABLE leaveData (f_id INT,fname VARCHAR(255),app_id INT,title VARCHAR(255),idate DATE);
    cur1 CURSOR FOR(SELECT pendingapp FROM HOD_CS);
    cur2 CURSOR FOR(SELECT pendingapp FROM HOD_EE);
    cur3 CURSOR FOR(SELECT pendingapp FROM HOD_ME);
    cur4 CURSOR FOR(SELECT pendingapp FROM HOD_CE);

BEGIN
    SELECT desig INTO design FROM Faculty WHERE facid=fid;

    IF design='HOD' THEN 
        SELECT dept INTO Dt FROM Faculty WHERE facid=fid;

        IF Dt='Computer Science' THEN 
            OPEN cur1;
            <<loop1>> LOOP
                FETCH cur1 INTO aid;
                IF NOT FOUND THEN EXIT loop1;
                END IF;
                SELECT f1.facid,l1.facname,f1.appid,f1.title,f1.issuedate INTO leaveData FROM faculty f1,leaveapp l1 WHERE l1.appid=aid AND l1.facid=f1.facid;
            END LOOP;
            CLOSE cur1;
            RETURN leaveData;

        ELSEIF Dt='Electrical' THEN 
            OPEN cur2;
            <<loop1>> LOOP
                FETCH cur1 INTO aid;
                IF NOT FOUND THEN EXIT loop1;
                END IF;
                SELECT f1.facid,l1.facname,f1.appid,f1.title,f1.issuedate INTO leaveData FROM faculty f1,leaveapp l1 WHERE l1.appid=aid AND l1.facid=f1.facid;
            END LOOP;
            CLOSE cur2;
            RETURN leaveData;

        ELSEIF Dt='Mechanical' THEN 
            OPEN cur3;
            <<loop1>> LOOP
                FETCH cur1 INTO aid;
                IF NOT FOUND THEN EXIT loop1;
                END IF;
                SELECT f1.facid,l1.facname,f1.appid,f1.title,f1.issuedate INTO leaveData FROM faculty f1,leaveapp l1 WHERE l1.appid=aid AND l1.facid=f1.facid;
            END LOOP;
            CLOSE cur3;
            RETURN leaveData;

        ELSEIF Dt='Civil' THEN 
            OPEN cur4;
            <<loop1>> LOOP
                FETCH cur1 INTO aid;
                IF NOT FOUND THEN EXIT loop1;
                END IF;
                SELECT f1.facid,l1.facname,f1.appid,f1.title,f1.issuedate INTO leaveData FROM faculty f1,leaveapp l1 WHERE l1.appid=aid AND l1.facid=f1.facid;
            END LOOP;
            CLOSE cur4;
            RETURN leaveData;
    END IF;

END;
$$ LANGUAGE plpgsql;


------------------------------------------------------------------------------------------------------------------

create or replace function insert_leaveApp(IN Id INT)
RETURNS VOID AS $$
DECLARE
    today DATE;
    issuedate DATE;
BEGIN
    today := CURRENT_DATE;
    SELECT startdate INTO issuedate FROM LeaveApp WHERE AppID=Id;

    IF today>issuedate THEN UPDATE LeaveApp SET retro=1 WHERE AppID=Id;
    ELSE 
        UPDATE LeaveApp SET retro=0 WHERE AppID=Id; 
    END IF;
    

END;
$$ LANGUAGE plpgsql;


-- -------------------------------------------------- MongoDB -----------------------------------------------------

    const facultySchema = new mongoose.Schema({
    facid: Number,
    name: String,
    background: String,
    Publication: [String],
    courses: [String]
    });
