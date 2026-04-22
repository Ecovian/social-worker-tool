const DB_NAME = 'swt_media';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';

function randomId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, callback) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, mode);
    const store = transaction.objectStore(PHOTO_STORE);

    let result;
    try {
      result = callback(store, transaction);
    } catch (error) {
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function savePhotoFile(file) {
  const id = `photo_${randomId()}`;
  const createdAt = new Date().toISOString();
  const record = {
    id,
    name: file.name || 'photo',
    type: file.type || 'application/octet-stream',
    size: file.size || 0,
    createdAt,
    blob: file,
  };

  await withStore('readwrite', (store) => {
    store.put(record);
  });

  return {
    id,
    name: record.name,
    type: record.type,
    size: record.size,
    createdAt,
  };
}

export async function savePhotoDataUrl(dataUrl, meta = {}) {
  const blob = await dataUrlToBlob(dataUrl);
  const id = meta.id || `photo_${randomId()}`;
  const createdAt = meta.createdAt || new Date().toISOString();
  const record = {
    id,
    name: meta.name || 'photo',
    type: meta.type || blob.type || 'image/jpeg',
    size: meta.size || blob.size || 0,
    createdAt,
    blob,
  };

  await withStore('readwrite', (store) => {
    store.put(record);
  });

  return {
    id,
    name: record.name,
    type: record.type,
    size: record.size,
    createdAt,
  };
}

export async function getPhotoRecord(id) {
  return withStore('readonly', async (store) => {
    const record = await requestToPromise(store.get(id));
    return record || null;
  });
}

export async function getPhotoDataUrl(photo) {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  if (photo.dataUrl) return photo.dataUrl;
  if (!photo.id) return null;

  const record = await getPhotoRecord(photo.id);
  if (!record?.blob) return null;
  return blobToDataUrl(record.blob);
}

export async function deletePhoto(id) {
  if (!id) return;
  await withStore('readwrite', (store) => {
    store.delete(id);
  });
}

export async function deletePhotoRefs(photos = []) {
  await Promise.all(
    photos
      .filter((photo) => photo && typeof photo === 'object' && photo.id)
      .map((photo) => deletePhoto(photo.id))
  );
}

export async function clearPhotoStore() {
  await withStore('readwrite', (store) => {
    store.clear();
  });
}

export async function exportPhotoBackup() {
  const records = await withStore('readonly', async (store) => {
    const all = await requestToPromise(store.getAll());
    return all || [];
  });

  return Promise.all(records.map(async (record) => ({
    id: record.id,
    name: record.name,
    type: record.type,
    size: record.size,
    createdAt: record.createdAt,
    dataUrl: await blobToDataUrl(record.blob),
  })));
}

export async function importPhotoBackup(photos = []) {
  await Promise.all(
    photos.map(async (photo) => {
      if (!photo?.dataUrl) return;
      await savePhotoDataUrl(photo.dataUrl, photo);
    })
  );
}
