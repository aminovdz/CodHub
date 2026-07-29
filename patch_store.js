const fs = require('fs');
const path = './src/lib/store/useAdminStore.ts';
let code = fs.readFileSync(path, 'utf8');

// Patch addStore
const oldAddStore = `addStore: async (store) => {
        const lang = store.language || 'en';`;

const newAddStore = `addStore: async (store) => {
        const proposedSlug = slugify(store.name);
        const exists = get().availableStores.some(s => slugify(s.name) === proposedSlug);
        if (exists) {
           useNotificationStore.getState().notify("A store with a similar name already exists.", "error");
           return;
        }
        const lang = store.language || 'en';`;

code = code.replace(oldAddStore, newAddStore);

// Patch updateStore
const oldUpdateStore = `updateStore: async (storeId, data) => {
        set((state) => {`;

const newUpdateStore = `updateStore: async (storeId, data) => {
        if (data.name) {
          const proposedSlug = slugify(data.name);
          const exists = get().availableStores.some(s => s.id !== storeId && slugify(s.name) === proposedSlug);
          if (exists) {
             useNotificationStore.getState().notify("A store with a similar name already exists.", "error");
             return;
          }
        }
        set((state) => {`;

code = code.replace(oldUpdateStore, newUpdateStore);

fs.writeFileSync(path, code);
console.log("Patched addStore and updateStore.");
