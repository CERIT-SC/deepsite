import Repository, { ICommit, IFile, IPage } from "@/models/Repository";
import {
  listSpaces as HFListSpaces, 
  listFiles as HFListFiles, 
  spaceInfo as HFSpaceInfo,
  uploadFiles as HFUploadFiles,
  deleteFiles as HFDeleteFiles,
  createRepo as HFCreateRepo,
  deleteRepo as HFDeleteRepo,
  listCommits as HFListCommits,
  downloadFile as HFDownloadFile,
  ListFileEntry,
} from "@huggingface/hub";
import dbConnect, { initGridFS } from "./mongodb";
import { auth } from "./my-auth";
import { Readable } from "stream";
import { ObjectId } from "bson";

export type RepoType = "space" | "dataset" | "model";

export interface RepoId {
  name: string;
  type: RepoType;
}

export type RepoFullName = string | `spaces/${string}` | `datasets/${string}`;

export type RepoDesignation = RepoId | RepoFullName;

interface GridFSFileMetadata {
  projectId: string;
  path: string;
  contentType: string;
  uploadedAt: Date;
  author: string;
}

const generateCommitOid = (): string => {
  return Array.from({ length: 40 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

export const listSpaces: typeof HFListSpaces = async function* (params) {
  const owner = params?.search?.owner;
  if (!owner) {
    throw new Error("Owner parameter is required to list spaces.");
  }
  await dbConnect();
  const repositories = await Repository.find({ author: owner });
  
  for (const repo of repositories) {
    yield {
      id: repo._id.toString(),
      likes: 0,
      updatedAt: repo.updatedAt,
      private: repo.private,
      sdk: repo.sdk,
      cardData: { tags: ["deepsite-v3"] },
      name: repo.projectId,      
    } as any;
  }
}

export const listFiles: typeof HFListFiles = async function* (params) {
  const { repo, path, revision } = params;
  
  const repoName = typeof repo === "string" ? repo : repo.name;
  await dbConnect();
  
  const repository = await Repository.findOne({ projectId: repoName });
  if (!repository) {
    return;
  } 

  let commit: ICommit | undefined;
  if (revision && revision !== "main") {
    commit = repository.commits.find((c: ICommit) => c.oid === revision);
  }
  else {
    commit = repository.commits[repository.commits.length - 1];
  }

  if (!commit) {
    return;
  }

  const allItems: ListFileEntry[] = [];

  commit.files.forEach((file: IFile) => {
    if (!path || file.path.startsWith(path)) {
      allItems.push({
        path: file.path,
        type: "file",
        size: 1024, // Mock size
        oid: "mock-oid" // Mock oid
      });
    }
  });

  const directories = new Set<string>();
  allItems.forEach(item => {
    const parts = item.path.split('/');
    if (parts.length > 1) {
      directories.add(parts[0]);
    }
  });

  directories.forEach(dir => {
    if (!path || path === dir) {
      allItems.push({
        path: dir,
        type: "directory",
        size: 1024, // Mock size
        oid: "mock-oid" // Mock oid
      });
    }
  });

  console.log("listFiles returning items:", allItems);
  for (const item of allItems) {
    yield item;
  }
}

export const spaceInfo: typeof HFSpaceInfo = async function (params) {
  const { name } = params;
  
  console.log("Fetching space info for:", name);
  await dbConnect();
  const repo = await Repository.findOne({ projectId: name });
  
  if (!repo) {
    return null;
  }

  return {
    id: repo._id.toString(),
    name: repo.projectId,
    sdk: repo.sdk,
    likes: 0,
    private: repo.private,
    updatedAt: repo.updatedAt,
    author: repo.author
  } as any;
}



export async function uploadFile(params: {
  repo: { name: string; type: RepoType };
  filename: string;
  content: string | Buffer | Readable | Blob;
  commitOid: string;
}): Promise<ObjectId> {
  const { repo, filename, content, commitOid } = params;

  const bucket = initGridFS();
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }
  
  const repository = await Repository.findOne({ projectId: repo.name });
  if (!repository) {
    throw new Error(`Repository ${repo.name} not found`);
  }
  
  
  let readableStream: Readable;
  
  if (typeof content === 'string') {
    readableStream = Readable.from([content]);
  } else if (content instanceof Buffer) {
    readableStream = Readable.from(content);
  } else if (content instanceof Blob) {
    const arrayBuffer = await content.arrayBuffer();
    readableStream = Readable.from(Buffer.from(arrayBuffer));
  } else if (content instanceof Readable) {
    readableStream = content;
  } else {
    readableStream = Readable.from([String(content)]);
  }

  const newFileId = new ObjectId();
  
  const uploadStream = bucket.openUploadStreamWithId(
    newFileId,
    filename,
    {
      metadata: {
        projectId: repo.name,
        uploadedAt: new Date(),
        author: repository.author
      } as GridFSFileMetadata
    }
  );
  
  readableStream.pipe(uploadStream);
  
  await new Promise<void>((resolve, reject) => {
    uploadStream.on('finish', () => resolve());
    uploadStream.on('error', reject);
  });
  
  const isHtmlFile = filename.endsWith('.html');
  const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
  
  const fileRecord = {
    path: filename,
    url: `${newFileId.toString()}`,
    extension: fileExtension,
    commitOid: commitOid
  };
  
  const commit = repository.commits.find((c: ICommit) => c.oid === commitOid);
  if (!commit) {
    console.warn(`Commit with oid ${commitOid} not found in repository ${repo.name}`);
  }
  
  const existingFileIndex = commit.files.findIndex((f: IFile) => f.path === filename);
  if (existingFileIndex >= 0) {
    commit.files[existingFileIndex] = fileRecord; 
  } else {
    commit.files.push(fileRecord);
  }

  // If it's an HTML file, also store the content in pages array for quick access
  // if (isHtmlFile) {
  //   let htmlContent = '';
  //   if (typeof content === 'string') {
  //     htmlContent = content;
  //   } else if (content instanceof Buffer) {
  //     htmlContent = content.toString('utf-8');
  //   } else if (content instanceof Blob) {
  //     htmlContent = await content.text();
  //   }
    
  //   const existingPageIndex = repository.pages.findIndex((p: IPage) => p.path === filename);
  //   if (existingPageIndex >= 0) {
  //     repository.pages[existingPageIndex].html = htmlContent;
  //   } else {
  //     repository.pages.push({
  //       path: filename,
  //       html: htmlContent
  //     });
  //   }
  // }
  repository.updatedAt = new Date();
  
  await repository.save();

  return newFileId;
}


export const uploadFiles: typeof HFUploadFiles = async function (params) {
  const { repo, files, commitTitle } = params;
  
  const repoName = typeof repo === "string" ? repo : repo.name;
  const repoType = typeof repo === "string" ? (repo.startsWith("spaces/") ? "space" : repo.startsWith("datasets/") ? "dataset" : "model") : repo.type; 
  
  await dbConnect();
  const repository = await Repository.findOne({ projectId: repoName });
  if (!repository) {
    throw new Error(`Repository ${repoName} not found`);
  }
  const previousCommit = repository.commits[repository.commits.length - 1];
  const previousFiles = previousCommit ? previousCommit.files : [];

  const commitOid = generateCommitOid();

  const actualCommitMessage = commitTitle || `Upload ${files.length} file(s)`;
  
  const newCommit: ICommit = {
    title: actualCommitMessage,
    oid: commitOid,
    date: new Date(),
    message: actualCommitMessage,
    files: previousFiles
  };

  repository.commits.push(newCommit);
  repository.updatedAt = new Date();
  await repository.save();

  for (const file of files as File[]) {
    try {
    await uploadFile({
      repo: { name: repoName, type: repoType },
      filename: file.name,
      content: file,
      commitOid: commitOid,
    });
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
    }
  }
  
  return {
    commit: {
      oid: commitOid,
      url: "https://example.com/dummy-upload-commit-url",
    },
    hookOutput: "Upload successful",
  };
}

export const deleteFiles: typeof HFDeleteFiles = async function (params) {
  const { repo, paths, commitTitle } = params;
  
  const repoName = typeof repo === "string" ? repo : repo.name;

  await dbConnect();
  const repository = await Repository.findOne({ projectId: repoName });
  if (!repository) {
    throw new Error(`Repository ${repoName} not found`);
  }

  const lastCommit = repository.commits[repository.commits.length - 1];
  const lastCommitFiles = lastCommit ? lastCommit.files : [];
  const newCommitFiles = lastCommitFiles.filter((f: IFile) => !paths.includes(f.path));

  const commitOid = generateCommitOid();
  const actualCommitMessage = commitTitle || `Removed ${paths.length} file(s)`;
  const newCommit: ICommit = {
    title: actualCommitMessage,
    oid: commitOid,
    date: new Date(),
    message: actualCommitMessage,
    files: newCommitFiles
  };

  repository.commits.push(newCommit);
  repository.updatedAt = new Date();
  
  return {
    commit: {
      oid: commitOid,
      url: "https://example.com/dummy-delete-commit-url",
    },
    hookOutput: "Delete successful",
  };
}


export const createRepo: typeof HFCreateRepo = async function (params) {
  const { repo } = params;
  
  const repoName = typeof repo === "string" ? repo.split("/").pop() || "dummy-repo" : repo.name;
  const repoType = typeof repo === "string" ? (repo.startsWith("spaces/") ? "space" : repo.startsWith("datasets/") ? "dataset" : "model") : repo.type;
  
  await dbConnect();
  const existingRepo = await Repository.findOne({ projectId: repoName });
  if (existingRepo) {
    throw new Error(`Repository with name ${repoName} already exists.`);
  }
  
  const session = await auth();
  if (!session || !session.user?.name) {
    throw new Error("Invalid or missing authentication session.");
  }

 
  const newRepo = new Repository({
    projectId: repoName,
    author: session.user.name,
    updatedAt: new Date(),
    type: repoType,
    private: false,
  });

  await newRepo.save();
  
  return {
    repoUrl: `${repoType === "space" ? "spaces" : repoType === "dataset" ? "datasets" : "models"}/${repoName}`,
    repo: {
      name: repoName,
      type: repoType,
    }
  };
}

export const deleteRepo: typeof HFDeleteRepo = async function (params) {
  const { repo } = params;
  
  const repoName = typeof repo === "string" ? repo.split("/").pop() || "dummy-repo" : repo.name;
  
  await dbConnect();
  const repository = await Repository.findOne({ projectId: repoName });
  if (!repository) {
    throw new Error(`Repository with name ${repoName} not found.`);
  }
  
  await Repository.deleteOne({ projectId: repoName });
  
  const bucket = initGridFS();
  if (bucket) {
    const filesCursor = bucket.find({ 'metadata.projectId': repoName });
    const files = await filesCursor.toArray();
    for (const file of files) {
      try {
        await bucket.delete(file._id);
      } catch (deleteError) {
        console.warn(`Could not delete file ${file._id}: ${deleteError}`);
      }
    }
  }
}

export const listCommits: typeof HFListCommits = async function* (params) {
  const { repo } = params;
  
  const repoName = typeof repo === "string" ? repo : repo.name;
  await dbConnect();
  const repository = await Repository.findOne({ projectId: repoName });
  
  if (!repository) {
    return;
  }

  for (const commit of repository.commits.slice().reverse()) {
    yield {
      oid: commit.oid,
      title: commit.title,
      date: commit.date,
      message: commit.message,
      authors: [{ username: repository.author, avatarUrl: "https://example.com/default-avatar.png" }]
    };
  }
}

export const downloadFile: typeof HFDownloadFile = async function (params) {
  const { repo, path, revision } = params;

  console.log(repo, path)

  const repoName = typeof repo === "string" ? repo : repo.name;
  await dbConnect();
  const repository = await Repository.findOne({ projectId: repoName });
  
  if (!repository) {
    return null;
  }

  let commit: ICommit | undefined;
  if (revision && revision !== "main") {
    commit = repository.commits.find((c: ICommit) => c.oid === revision);
  }
  else {
    commit = repository.commits[repository.commits.length - 1];
  }
  
  if (!commit) {
    return null;
  }

  const fileRecord = commit.files.find((f: IFile) => f.path === path);
  if (!fileRecord) {
    return null;
  }
  const fileId = fileRecord.url.split('/').pop();
  if (!fileId) {
    return null;
  }

  const bucket = initGridFS();
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }

  const id = ObjectId.createFromHexString(fileId);
  const downloadStream = bucket.openDownloadStream(id);

  let data: Buffer[] = [];
  for await (const chunk of downloadStream) {
    data.push(chunk);
  }
  const fileBuffer = Buffer.concat(data);

  const extension = fileRecord.extension.toLowerCase();
  let type = 'application/octet-stream';
  if (extension === 'html') {
    type = 'text/html';
  } else if (extension === 'css') {
    type = 'text/css';
  } else if (extension === 'js') {
    type = 'application/javascript';
  } else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(extension)) {
    type = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  } else if (extension === 'json') {
    type = 'application/json';
  }

  const blob = new Blob([fileBuffer], { type: type });
  return blob;
}