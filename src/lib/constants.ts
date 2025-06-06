
// MongoDB Collection Names
export const USERS_COLLECTION = "users";
export const STUDENT_PROFILES_COLLECTION = "student_profiles";
export const MARKS_COLLECTION = "marks";
export const PROJECTS_COLLECTION = "projects";
export const MOOCS_COLLECTION = "moocs";
export const FACULTY_SUBJECT_ASSIGNMENTS_COLLECTION = "faculty_subject_assignments";


export const mapMongoId = <T extends { _id: any }>(doc: T): Omit<T, '_id'> & { id: string } => {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() };
};

export const mapToMongoId = <T extends { id: string }>(doc: T): Omit<T, 'id'> & { _id: string } => {
  const { id, ...rest } = doc;
  return { ...rest, _id: id };
};
