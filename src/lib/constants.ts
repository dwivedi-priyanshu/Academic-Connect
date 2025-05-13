// MongoDB Collection Names
export const USERS_COLLECTION = "users";
export const STUDENT_PROFILES_COLLECTION = "student_profiles";
export const MARKS_COLLECTION = "marks";
export const PROJECTS_COLLECTION = "projects";
export const MOOCS_COLLECTION = "moocs";

// Function to convert MongoDB _id to string id and vice-versa if needed
// And to ensure all data going to DB uses _id and data from DB uses id string

export const mapMongoId = <T extends { _id: any }>(doc: T): Omit<T, '_id'> & { id: string } => {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() };
};

export const mapToMongoId = <T extends { id: string }>(doc: T): Omit<T, 'id'> & { _id: string } => {
  const { id, ...rest } = doc;
  return { ...rest, _id: id };
};
