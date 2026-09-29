const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const outputDirectory = path.resolve(
   __dirname,
   '../public/img/tours',
);
const maximumImageSize = 15 * 1024 * 1024;

const imageUrls = {
   'tour-1-cover.jpg': {
      url: 'https://wildyness.com/uploads/0000/145/2023/07/17/bni-mtir-ain-drahem.png',
      searchTerm: 'Ain Draham Tunisia cork oak forest wide landscape',
   },
   'tour-1-1.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlr4QIZVP_Yhf9XSrfMzxx4GFjET9-Yz3H9FbykLRgHg&s=10',
      searchTerm: 'El Feija National Park Tunisia forest trail',
   },
   'tour-1-2.jpg': {
      url: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/15/5c/d4/bd/ichkeul-lake.jpg?w=1200&h=-1&s=1',
      searchTerm: 'Ichkeul National Park Tunisia lake mountains',
   },
   'tour-1-3.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxK1_pHW_7vxMECPlFsyIntnyUicNjQtOWANsuATwR9g&s=10',
      searchTerm: 'Tabarka Tunisia mountain hiking trail',
   },
   'tour-2-cover.jpg': {
      url: 'https://images.musement.com/cover/0178/13/thumb_17712745_cover_header.jpg',
      searchTerm: 'Hammamet Tunisia Mediterranean beach boat',
   },
   'tour-2-1.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRi6-AgojpOYx0b4MwzBbQbe_Pz2wcT4VDA9SzFcBSpUA&s=10',
      searchTerm: 'Sidi Bou Said Tunisia blue white coast sea',
   },
   'tour-2-2.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3F45AcEIMEjw_UCRC9VzaBNnGVrbCVYVVi6rXInRLHOkLhYvroZrTDoz7&s=10',
      searchTerm: 'Tabarka Tunisia coral coast Mediterranean sea',
   },
   'tour-2-3.jpg': {
      url: 'https://carthagemagazine.com/wp-content/uploads/2020/11/Old-Port-Bizerte.jpg',
      searchTerm: 'Bizerte Tunisia old port harbor',
   },
   'tour-3-cover.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmYbV2yxa5cu-9P7jbx9DpxFAZMDUDzqAcv5mr39FqpA&s=10',
      searchTerm: 'Tozeur Tunisia oasis palm trees desert',
   },
   'tour-3-1.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE7ulFvwwFnSnnG3_f1-8Y2ob_HvucK8uuVrnJohIqGA&s=10',
      searchTerm: 'Chott el Jerid Tunisia salt lake desert',
   },
   'tour-3-2.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWh6m0vTQqDP6fcG8AyXXfyNqXFIXKWRInldzjHsGXY4mEGLcSHIn55-I&s=10',
      searchTerm: 'Ksar Ghilane Tunisia oasis desert dunes',
   },
   'tour-3-3.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5AXyBsL_v2pgv2Gjd83mTjTo1I4S61GILBMYu7obhog&s=10',
      searchTerm: 'Sahara Tunisia desert dunes sunset',
   },
   'tour-4-cover.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4ijzXau0ZnYcUr1ltXzQX6IIa-6sq8wbZTwFfWc_08Q&s=10',
      searchTerm: 'Tunis Tunisia medina historic city streets',
   },
   'tour-4-1.jpg': {
      url: 'https://carthagemagazine.com/wp-content/uploads/2022/10/The-Medina-of-Tunis-1-1024x678.jpg',
      searchTerm: 'Medina of Tunis Tunisia traditional architecture',
   },
   'tour-4-2.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNqeZpukDDEupx-pfTcTvpNxSoQuX9ba0XtXjBaYD5oJ3hjNsp3ewMKJze&s=10',
      searchTerm: 'Hammamet Tunisia medina white blue streets',
   },
   'tour-4-3.jpg': {
      url: 'https://rimotours.com/wp-content/uploads/2024/12/0a.jpg',
      searchTerm: 'Sousse Tunisia medina seaside city',
   },
   'tour-5-cover.jpg': {
      url: 'https://camp-mars.com/wp-content/uploads/2026/01/dd9b6671-954b-4c0c-b6a5-cab543210f7f.jpeg',
      searchTerm: 'Douz Tunisia desert camping Sahara landscape',
   },
   'tour-5-1.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSafVdZId3EYmgdXSsK8l_Yhem1128p2EPRMm5Qn2N4GH1ZrqKcj_WOWqw&s=10',
      searchTerm: 'Matmata Tunisia troglodyte underground homes',
   },
   'tour-5-2.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTC3s5716qFKp4t0Hff437qPSfmW4pQx_0ps3N4QHO8Uy3Ds0PW5t0OBfs&s=10',
      searchTerm: 'Chenini Tunisia mountain village ksar',
   },
   'tour-5-3.jpg': {
      url: 'https://wildyness.com/uploads/0000/145/2021/12/25/jebil-national-park-mountain.jpg',
      searchTerm: 'Jebil National Park Tunisia desert landscape',
   },
   'tour-6-cover.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCAMd_WQOJ3T5Xj1ZpSjX5bx8_-DaBWC2pfRizebUKHsH-VssW2VXl180H&s=10',
      searchTerm: 'Tabarka Tunisia scuba diving underwater coast',
   },
   'tour-6-1.jpg': {
      url: 'https://wildyness.com/uploads/0000/27/2023/01/16/sunset-kayak-in-bizerte-wildynesscom-600.jpg',
      searchTerm: 'Bizerte Lagoon Tunisia kayaking',
   },
   'tour-6-2.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3nHffryiYeHXkJAQxdKjmVDAJ1vkwbKco71ON8Kw7tGQ4zp5WajHE0LQ&s=10',
      searchTerm: 'Cap Serrat Tunisia coastal hiking cliffs',
   },
   'tour-6-3.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRg_h1BDeg4NgeHI079zNMXJ9VXA17PzQpHjA_IuGbrpg&s=10',
      searchTerm: 'Ichkeul National Park Tunisia wetlands wildlife',
   },
   'tour-7-cover.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQck1fEcWOBQW1u1iwLqtZOSWp5J5Dh-urbzCynkbFu4w&s=10',
      searchTerm: 'Dougga Tunisia Roman ruins archaeological site',
   },
   'tour-7-1.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7aCLfRVkdTVBjA6tc69P8p6gjsfcNiaPTKaPCaDTMlcza_oioefL2PL8&s=10',
      searchTerm: 'Dougga Tunisia Roman theater columns',
   },
   'tour-7-2.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHk088ELCFxEwC9O2QTVrmr7HsEg44hVmquXRWwxtWURA5hWdOilPhC18&s=10',
      searchTerm:
         'Bulla Regia Tunisia Roman ruins underground houses',
   },
   'tour-7-3.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUbGxIVj24zp_W134nNAjFIUiZeoJ5WVeUPFfVa12Eww&s=10',
      searchTerm: 'Thuburbo Majus Tunisia Roman ruins',
   },
   'tour-8-cover.jpg': {
      url: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/03/5d/80/f0/camp-mars.jpg?w=1200&h=-1&s=1',
      searchTerm: 'Ksar Ghilane Tunisia desert camp night stars',
   },
   'tour-8-1.jpg': {
      url: 'https://xperiencetunisia.com/wp-content/uploads/2026/03/Copy-of-Camp_experience-1024x536.jpg',
      searchTerm: 'Tembaine Tunisia desert camp Milky Way',
   },
   'tour-8-2.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRk_xGL08ppRyw2WKY6Qw0ttwtU6u3JmNx7A4Y8QzMyodPmQPpCOWOVM2jQ&s=10',
      searchTerm: 'Chott el Jerid Tunisia night sky stars',
   },
   'tour-8-3.jpg': {
      url: 'https://thumbs.dreamstime.com/b/sahara-milky-way-moving-night-sky-over-desert-morocco-39175358.jpg',
      searchTerm: 'Sahara Tunisia astrophotography Milky Way desert',
   },
   'tour-9-cover.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqas2_Z4zdy-_WcMjfgoIPRh1VieZRe0G3KwUwQ85G99VkgRtkU8QKuOTu&s=10',
      searchTerm: 'Tozeur Tunisia palm oasis golden light',
   },
   'tour-9-1.jpg': {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRl3Z_M9_ROsS9poo625S0SVjkNVQ7JLI-FudkMRpjtAX5J63XINhCN_kNT&s=10',
      searchTerm: 'Tozeur Tunisia oasis palms desert sunset',
   },
   'tour-9-2.jpg': {
      url: 'https://www.saharansky.com/file/2019/07/SAHARANSKY-NEWYEAR2.jpg',
      searchTerm: 'Tunisia Sahara stars desert landscape night',
   },
   'tour-9-3.jpg': {
      url: 'https://www.bennejitravel.com/uploads/0000/6/2026/03/22/caption1.jpg',
      searchTerm: 'Tozeur Tunisia desert camp night sky',
   },
};

const requestImage = (imageUrl, redirectCount = 0) =>
   new Promise((resolve, reject) => {
      let parsedUrl;

      try {
         parsedUrl = new URL(imageUrl);
      } catch (error) {
         reject(new Error(`Invalid URL: ${imageUrl}`));
         return;
      }

      const requestModule =
         parsedUrl.protocol === 'https:' ? https : http;
      const request = requestModule.get(
         parsedUrl,
         { headers: { 'User-Agent': 'Natours image downloader' } },
         (response) => {
            const redirectUrl = response.headers.location;

            if (
               [301, 302, 303, 307, 308].includes(
                  response.statusCode,
               ) &&
               redirectUrl
            ) {
               response.resume();
               if (redirectCount >= 5) {
                  reject(
                     new Error(`Too many redirects: ${imageUrl}`),
                  );
                  return;
               }

               const nextUrl = new URL(
                  redirectUrl,
                  parsedUrl,
               ).toString();
               requestImage(nextUrl, redirectCount + 1)
                  .then(resolve)
                  .catch(reject);
               return;
            }

            if (
               response.statusCode < 200 ||
               response.statusCode >= 300
            ) {
               response.resume();
               reject(
                  new Error(
                     `Download failed with HTTP ${response.statusCode}: ${imageUrl}`,
                  ),
               );
               return;
            }

            const contentType =
               response.headers['content-type'] || '';
            if (!contentType.toLowerCase().startsWith('image/')) {
               response.resume();
               reject(new Error(`URL is not an image: ${imageUrl}`));
               return;
            }

            const chunks = [];
            let totalSize = 0;

            response.on('data', (chunk) => {
               totalSize += chunk.length;
               if (totalSize > maximumImageSize) {
                  request.destroy(
                     new Error(`Image exceeds 15 MB: ${imageUrl}`),
                  );
                  return;
               }
               chunks.push(chunk);
            });

            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
         },
      );

      request.setTimeout(30000, () => {
         request.destroy(
            new Error(`Download timed out: ${imageUrl}`),
         );
      });
      request.on('error', reject);
   });

const getAvailableImages = () => {
   const availableImages = [];
   const skippedImages = [];

   Object.entries(imageUrls).forEach(([fileName, image]) => {
      if (!image.url.trim()) {
         skippedImages.push({
            fileName,
            reason: 'URL is empty',
         });
         return;
      }

      try {
         const parsedUrl = new URL(image.url);
         if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new Error('unsupported URL protocol');
         }
         availableImages.push({ fileName, imageUrl: image.url });
      } catch (error) {
         skippedImages.push({
            fileName,
            reason: error.message,
         });
      }
   });

   return { availableImages, skippedImages };
};

const downloadImages = async () => {
   const { availableImages, skippedImages } = getAvailableImages();
   if (!availableImages.length) {
      throw new Error('No valid image URLs were provided.');
   }

   await fs.promises.mkdir(outputDirectory, { recursive: true });

   const temporaryDirectory = await fs.promises.mkdtemp(
      path.join(outputDirectory, '.tour-images-'),
   );
   const downloadedImages = [];

   try {
      for (const { fileName, imageUrl } of availableImages) {
         process.stdout.write(`Downloading ${fileName}... `);
         const image = await requestImage(imageUrl);
         const temporaryPath = path.join(
            temporaryDirectory,
            fileName,
         );
         await fs.promises.writeFile(temporaryPath, image);
         downloadedImages.push({ fileName, temporaryPath });
         console.log('done');
      }

      for (const { fileName, temporaryPath } of downloadedImages) {
         await fs.promises.copyFile(
            temporaryPath,
            path.join(outputDirectory, fileName),
         );
      }

      console.log(`Replaced ${downloadedImages.length} tour images.`);
      if (skippedImages.length) {
         console.log('Skipped image slots:');
         skippedImages.forEach(({ fileName, reason }) => {
            console.log(
               `- ${fileName}: ${reason}. Search: ${imageUrls[fileName].searchTerm}`,
            );
         });
      }
   } finally {
      await fs.promises.rm(temporaryDirectory, {
         recursive: true,
         force: true,
      });
   }
};

downloadImages().catch((error) => {
   console.error(`Image download failed: ${error.message}`);
   process.exitCode = 1;
});
