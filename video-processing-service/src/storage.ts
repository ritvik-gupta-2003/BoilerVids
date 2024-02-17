import {Storage} from '@google-cloud/storage';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import e from 'express';

const storage = new Storage();

const rawVideoBucketName = "uploaded-raw-videos";
const processedVideoBucketName = "uploaded-processed-videos";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

/**
 * Creates the local directories for raw and processed videos.
 */
export function setupDirectories() {

    ensureDirectoryExistence(localRawVideoPath);
    ensureDirectoryExistence(localProcessedVideoPath);

}



/**
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}.
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}.
 * @returns A promise that resolves when the video has been converted.
 */
export function convertVideo(rawVideoName: string, processedVideoName: string) {
    return new Promise<void>((resolve, reject) => {
        const rawVideoPath = `${localRawVideoPath}/${rawVideoName}`;

        if (!fs.existsSync(rawVideoPath)) {
            console.log(`File not found: ${rawVideoPath}`);
            reject(new Error(`File not found: ${rawVideoPath}`));
            return;
        }

        ffmpeg(rawVideoPath)
            .outputOptions("-vf", "scale=-1:360")
            .on("end", () => {
                console.log("Video Processing Finished Successfully.");
                resolve();
            })
            .on("error", (err) => {
                console.log(`An error occurred with ffmpeg: ${err.message}`);
                reject(err);
            })
            .save(`${localProcessedVideoPath}/${processedVideoName}`);
    });
}




/**
 * @param fileName - The name of the file to download from the 
 * {@link rawVideoBucketName} bucket into the {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been downloaded or rejects if an error occurs.
 */
export async function downloadRawVideo(fileName: string) {
    try {
        const fileExists = await storage.bucket(rawVideoBucketName).file(fileName).exists();
        if (!fileExists[0]) {
            console.log(`File ${fileName} does not exist in bucket ${rawVideoBucketName}.`);
            return; // Or handle this case as needed.
        }

        await storage.bucket(rawVideoBucketName)
            .file(fileName)
            .download({destination: `${localRawVideoPath}/${fileName}`});

        console.log(`gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`);
    } catch (error) {
        console.error(`Error downloading file ${fileName}: `, error);
        // Implement retry logic or other error handling as needed.
    }
}



/**
 * @param fileName - The name of the file to upload from the 
 * {@link localProcessedVideoPath} folder into the {@link processedVideoBucketName}.
 * @returns A promise that resolves when the file has been uploaded.
 */
export async function uploadProcessedVideo(fileName: string) {

    const bucket = storage.bucket(processedVideoBucketName);
    
    await bucket.upload(`${localProcessedVideoPath}/${fileName}`, {
        destination: fileName
    });

    console.log(
        `${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}.`
    );

    await bucket.file(fileName).makePublic();

}



/**
 * @param fileName - The name of the file to delete from the
 * {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 * 
 */
export function deleteRawVideo(fileName: string) {
    
    return deleteFile(`${localRawVideoPath}/${fileName}`);

}



/**
* @param fileName - The name of the file to delete from the
* {@link localProcessedVideoPath} folder.
* @returns A promise that resolves when the file has been deleted.
* 
*/
export function deleteProcessedVideo(fileName: string) {

    return deleteFile(`${localProcessedVideoPath}/${fileName}`);

}



/**
 * @param filePath - The path of the file to delete.
 * @returns A promise that resolves when the file has been deleted.
 */
function deleteFile(filePath: string): Promise<void> {

    return new Promise((resolve, reject) => {

        if (fs.existsSync(filePath)) {

            fs.unlink(filePath, (err) => {

                if (err) {

                    console.log(`Failed to delete file at ${filePath}, err`);
                    reject(err);
                }
                else {

                    console.log(`File deleted at ${filePath}`);
                    resolve();
                }

            });
            
        }
        else {

            console.log(`File not found at ${filePath}, skipping the delete.`);
            resolve();
        }

    });

}



/**
 * Ensures a directory exists, creating it if necessary.
 * @param {string} dirPath - The directory path to check.
 */
function ensureDirectoryExistence(dirPath: string) {

    if (!fs.existsSync(dirPath)) {

        fs.mkdirSync(dirPath, {recursive: true});

        console.log(`Created directory at ${dirPath}`);
    }
}