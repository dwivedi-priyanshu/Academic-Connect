
// This file can be expanded or replaced by a database collection in the future.
export const ALL_SUBJECTS_BY_SEMESTER: Record<string, { code: string, name: string }[]> = {
  "1": [
    { code: "MA101", name: "Applied Mathematics I" }, 
    { code: "PH102", name: "Engineering Physics" },
    { code: "CV103", name: "Elements of Civil Engineering" },
    { code: "EE104", name: "Basic Electrical Engineering" },
    { code: "ME105", name: "Elements of Mechanical Engineering" },
  ],
  "2": [
    { code: "MA201", name: "Applied Mathematics II" }, 
    { code: "CH202", name: "Engineering Chemistry" },
    { code: "CS203", name: "Problem Solving with C" },
    { code: "EC204", name: "Basic Electronics" },
    { code: "EN205", name: "Communicative English" },
  ],
  "3": [
    { code: "MA301", name: "Transform Calculus & PDEs" },
    { code: "CS302", name: "Data Structures and Algorithms" }, 
    { code: "CS303", name: "Analog and Digital Electronics" }, 
    { code: "CS304", name: "Computer Organization & Architecture" },
    { code: "CS305", name: "Software Engineering" },
    { code: "CS306", name: "Discrete Mathematical Structures" },
  ],
  "4": [
    { code: "MA401", name: "Complex Analysis & Probability" },
    { code: "CS402", name: "Design and Analysis of Algorithms" }, 
    { code: "CS403", name: "Operating Systems" }, 
    { code: "CS404", name: "Microcontrollers & Embedded Systems" },
    { code: "CS405", name: "Object Oriented Programming with Java" },
    { code: "CS406", name: "Constitution of India" },
  ],
  "5": [
    { code: "CS501", name: "Database Management Systems" }, 
    { code: "CS502", name: "Computer Networks" },
    { code: "CS503", name: "Formal Languages & Automata Theory" },
    { code: "CS504", name: "Professional Elective I" }, // Example Elective
    { code: "CS505", name: "Open Elective A" }, // Example Open Elective
    { code: "CS506", name: "Environmental Science" },
  ],
  "6": [
    { code: "CS601", name: "Compiler Design" }, 
    { code: "CS602", name: "Web Technologies & Applications" },
    { code: "CS603", name: "Cryptography & Network Security" },
    { code: "CS604", name: "Professional Elective II" }, // Example Elective
    { code: "CS605", name: "Open Elective B" }, // Example Open Elective
    { code: "CS606", name: "Project Management & Finance" },
  ],
  "7": [
    { code: "CS701", name: "Artificial Intelligence & Machine Learning" }, 
    { code: "CS702", name: "Big Data Analytics" },
    { code: "CS703", name: "Professional Elective III" },
    { code: "CS704", name: "Professional Elective IV" },
    { code: "CS705", name: "Project Work Phase I" },
  ],
  "8": [
    { code: "CS801", name: "Internet of Things (IoT)" }, 
    { code: "CS802", name: "Professional Elective V" },
    { code: "CS803", name: "Project Work Phase II & Seminar" },
    { code: "CS804", name: "Internship" },
  ],
};

export const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Electrical"];
