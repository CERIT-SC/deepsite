import mongoose from "mongoose";

export interface IPage {
  path: string;
  html: string;
}

export interface IFile {
  path: string;
  url: string;
  extension: string;
  commitOid: string;
}

export interface ICommit {
  title: string;
  oid: string;
  date: Date;
  message: string;
  files: IFile[];
}

export interface IHFRepository extends Document {
  projectId: string;
  spaceId: string;
  author: string;
  private: boolean;
  updatedAt: Date;
  createdAt: Date;
  name: string;
  type: "space";
  sdk: "static";

  pages: IPage[];
  files: IFile[];
  commits: ICommit[];
}

const PageSchema = new mongoose.Schema<IPage>({
  path: { type: String, required: true },
  html: { type: String, required: true }
}, { _id: false });

const FileSchema = new mongoose.Schema<IFile>({
  path: { type: String, required: true },
  url: { type: String, required: true },
  extension: { type: String, required: true },
  commitOid: { type: String, required: true }
}, { _id: false });

const CommitSchema = new mongoose.Schema<ICommit>({
  title: { type: String, required: true },
  oid: { type: String, required: true },
  date: { type: Date, required: true },
  files: { type: [FileSchema], required: true, default: [] },
}, { _id: false });

const RepositorySchema = new mongoose.Schema<IHFRepository>({
  projectId: { type: String, required: true, unique: true, index: true },
  author: { type: String, required: true, index: true },
  private: { type: Boolean, required: true, default: false },
  updatedAt: { type: Date, required: true },
  createdAt: { type: Date, required: true, default: Date.now },
  type: { type: String, required: true, enum: ["space"], default: "space" },
  sdk: { type: String, required: true, enum: ["static"], default: "static" },
  pages: { type: [PageSchema], required: true, default: [] },
  commits: { type: [CommitSchema], required: true, default: [] }
}, {
  timestamps: true
});

RepositorySchema.index({ "pages.path": 1 });

export default mongoose.models.Repository || mongoose.model("Repository", RepositorySchema);