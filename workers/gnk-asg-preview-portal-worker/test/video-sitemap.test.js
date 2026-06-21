import { handleVideoSitemap, readUploadedVideos } from '../src/video-sitemap.js';

class AssetStore {
  constructor(files) {
    this.files = files;
  }

  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (!(pathname in this.files)) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(this.files[pathname]), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
}

const emptyEnv = {
  ASSETS: new AssetStore({
    '/data/video-featured.json': {
      id: 'featured',
      status: 'draft',
      mp4Url: '',
      poster: '/assets/poster.jpg'
    },
    '/data/video-library-items.json': { items: [] }
  })
};

const emptyItems = await readUploadedVideos(emptyEnv);
if (emptyItems.length !== 0) throw new Error('Draft video must not be indexable.');
const emptyResponse = await handleVideoSitemap(emptyEnv);
if (emptyResponse.status !== 204) throw new Error('Empty video sitemap must return 204.');

const readyEnv = {
  ASSETS: new AssetStore({
    '/data/video-featured.json': {
      id: 'film-4k',
      status: 'ready',
      indexable: true,
      titleHr: 'GNK ASG 4K film',
      descriptionHr: 'Korporativni film.',
      mp4Url: '/media/film-4k.mp4',
      poster: '/media/film-4k.jpg',
      uploadDate: '2026-06-21T08:00:00Z'
    },
    '/data/video-library-items.json': {
      items: [
        {
          id: 'placeholder',
          status: 'draft',
          titleHr: 'Placeholder',
          mp4Url: ''
        }
      ]
    }
  })
};

const readyItems = await readUploadedVideos(readyEnv);
if (readyItems.length !== 1 || readyItems[0].id !== 'film-4k') {
  throw new Error('Only the uploaded film may enter the sitemap.');
}

const response = await handleVideoSitemap(readyEnv);
if (response.status !== 200) throw new Error('Uploaded video sitemap must return 200.');
const xml = await response.text();
if (!xml.includes('<video:content_loc>https://gnk-asg.hr/media/film-4k.mp4</video:content_loc>')) {
  throw new Error('Uploaded film content URL is missing.');
}
if (xml.includes('Placeholder')) throw new Error('Placeholder video leaked into sitemap.');

console.log('Video sitemap gate test passed.');
