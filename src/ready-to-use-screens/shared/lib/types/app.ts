export type App = {
  _creationTime: number;
  _id: string;
  icon_image_storage_id: string;
  icon_url: string;
  title: string;
};

export type Video = {
  dev: {
    asset_id: string;
    playback_id: string;
  };
  prod: {
    asset_id: string;
    playback_id: string;
  };
};

export type Animation = {
  _creationTime: number;
  _id: string;
  app: App;
  app_deeplink: string;
  app_id: string;
  components: string[];
  description: string;
  difficulty: string[];
  priority: boolean;
  slug: string;
  technologies: string[];
  title: string;
  video: Video;
  objectID: string;
};
