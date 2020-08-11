import {bindEvent, getElement, getElements, on} from "./helpers/functions";
import {closeSiblingTreeOf, getSelectedPath} from "./helpers/treeView";
import refresh from "./actions/refresh";
import state from "./state";
import addFile from "./actions/addFile";
import addFolder from "./actions/addFolder";
import modal from "./helpers/modal";
import getFileContent from "./actions/getFileContent";
import {browse, back} from "./actions/listing";
import edit from "./actions/edit";
import remove from "./actions/remove";
import rename from "./actions/rename";
import getDirectoryTree from "./actions/getDirectoryTree";
import move from "./actions/move";
import File from "./entities/File";

const App = function () {

    var registry = [];

    this.registerEvents = function () {
        registry.push(load);
        
        /**
         * Directory browse.
         */
        registry.push(sidebarDirectoryListing);
        registry.push(tableDirectoryListing);

        /**
         * Actions
         */
        registry.push(refreshAction);
        registry.push(addFileAction);
        registry.push(addFolderAction);
        registry.push(removeFilesAction);
        registry.push(renameAction);
        registry.push(moveFileAction);
        registry.push(editFileAction);
        registry.push(changePermissionsAction);

        /**
         * Others
         */
        registry.push(editorGetFileContent);
        registry.push(moveFileModalGetDirectoryTree);
        registry.push(moveFileModalItemsClick);
        registry.push(updateModalPermissions);
        registry.push(updateModalInfo);
        registry.push(toolbarActions);
    };

    this.init = function () {
        registry.forEach(function (fn) {
            fn();
        });
    };

    var load = function () {
        bindEvent('DOMContentLoaded', document, browse(state.path));
    };

    var sidebarDirectoryListing = function () {
        on('click', '.sidebar .dir-item', function (e) {
            if (!e.target.closest('.file-item')) { // ignore file items click
                const
                    item = e.target.closest('.dir-item'),
                    fileName = decodeURI(item.dataset.name);

                item.dataset.open = 'true';

                // if the clicked element is already have been clicked then remove its content
                if (state.path.split('/').includes(fileName) || fileName === '/') {
                    item.querySelector('.sub-files').textContent = '';
                }

                closeSiblingTreeOf(item);
                console.log(getSelectedPath());
                browse(state.path = getSelectedPath());
            }
        });
    };

    var tableDirectoryListing = function () {
        on('dblclick', '.files-table .file-item[data-type="dir"]', function (e) {
            const
                item = e.target.closest('.file-item[data-type="dir"]'),
                fileName = getElement('.file-name', item).textContent.trim();

            const path = getSelectedPath() + fileName + '/';

            // find the sidebar alternative file and make it open
            if (path !== '/') {
                getElement('.sidebar .dir-item[data-name="' + encodeURI(fileName) + '"]').dataset.open = 'true';
            }

            browse(state.path = path);

            // Disable footer right buttons
            getElements('.right-buttons *[data-action]').forEach(function (button) {
                button.disabled = true;
            });
        });
    };

    var refreshAction = function () {
        bindEvent('click', 'button[data-action="refresh"]', function () {
            refresh(state.path);
        });
    };

    var addFileAction = function () {
        bindEvent('click', '#addFileBtn', function () {
            addFile(getElement('#addFileModal #fileName').value, state.path);
        });
    };

    var addFolderAction = function () {
        bindEvent('click', '#addFolderBtn', function () {
            addFolder(getElement('#addFolderModal #folderName').value, state.path);
        });
    };

    var editorGetFileContent = function () {
        // Get editor file content when double clicking in a table file item
        on('dblclick', '.files-table .file-item[data-type="file"]', function (e) {
            modal('#editorModal').show();
            const clickedFileName = getElement('.file-name', e.target.closest('.file-item')).textContent;
            state.editableFile = state.path + clickedFileName;
            getFileContent(state.editableFile);
        });

        // Get editor file content when clicking in a sidebar file item
        on('click', '.sidebar .file-item', function (e) {
            const
                file = e.target.closest('.file-item'),
                fileName = file.dataset.name;

            closeSiblingTreeOf(file);
            state.path = getSelectedPath();
            modal('#editorModal').show();
            state.editableFile = state.path + fileName;
            getFileContent(state.editableFile);
        });
    };

    var editFileAction = function () {
        bindEvent('click', '#updateFileBtn', function () {
            edit(state.editableFile, fmEditor.get());
        });
    };

    var removeFilesAction = function () {
        bindEvent('click', '#removeFileBtn', function () {
            const
                selectedItems = getElements('.files-table .file-item.selected'),
                files = [];

            selectedItems.forEach(function (item) {
                const name = getElement('.file-name', item).textContent;
                files.push(state.path + name);
            });

            remove(files);
        });
    };

    var renameAction = function () {
        bindEvent('click', '#renameFileBtn', function () {
            const
                file = getElement('#renameFileModal .name-for').textContent,
                newName = getElement('#newFileName').value;

            rename(state.path, file, newName);
        });
    };

    var moveFileModalGetDirectoryTree = function () {
        bindEvent('click', 'button[data-action="move"]', function () {
            getDirectoryTree();
        });
    };

    var moveFileModalItemsClick = function () {
        on('click', '.move-file-modal .dir-item', function (e) {
            const ele = e.target.closest('.dir-item');
            if (ele.dataset.open === 'false') {
                ele.dataset.open = 'true';
                getElement('.sub-files', ele).style.display = 'block';
            } else {
                ele.dataset.open = 'false';
                getElement('.sub-files', ele).style.display = 'none';
            }
        });
    };

    var moveFileAction = function () {
        bindEvent('click', '#moveFileBtn', function () {
            const
                file = getElement('#moveFileModal .source').textContent,
                newPath = getElement("#moveFileModal .destination").textContent;

            move(state.path, file, newPath);
        });
    };

    var changePermissionsAction = function () {
        bindEvent('click', '#changePermBtn', function () {
            const
                file = getElement('#permissionsModal .filename').textContent,
                chmod = getElement('#permissionsModal .numeric-chmod').textContent;

            permissions(state.path, file, chmod);
        });
    };

    var updateModalPermissions = function () {
        bindEvent('click', 'button[data-action="permissions"]', function () {
            const
                file = state.getFileByName(getElement('#permissionsModal .filename').textContent),
                permissions = file.permissions,
                chunks = permissions.slice(1).split(''),
                perms = {
                    owner: chunks.slice(0, 3),
                    group: chunks.slice(3, 6),
                    others: chunks.slice(6)
                },
                translate = {
                    'r': 'read',
                    'w': 'write',
                    'x': 'execute'
                },
                rules = {
                    'r': 4,
                    'w': 2,
                    'x': 1,
                };

            var chmod = [0, 0, 0];
            for (var prop in perms) {
                if (perms.hasOwnProperty(prop)) {
                    perms[prop].forEach(function (perm) {
                        if (perm !== '-') {
                            getElement(`#permissionsModal .checkbox[data-action="${translate[perm]}"][data-group="${prop}"] input[type=checkbox]`).checked = true;

                            switch (prop) {
                                case 'owner':
                                    chmod[0] += rules[perm];
                                    break;
                                case 'group':
                                    chmod[1] += rules[perm];
                                    break;
                                case 'others':
                                    chmod[2] += rules[perm];
                                    break;
                            }
                        }
                    });
                }
            }

            getElement('#permissionsModal .numeric-chmod').textContent = `0${chmod.join('')}`;
        });
    };

    var updateModalInfo = function () {
        bindEvent('click', 'button[data-action="info"]', function () {
            const
                selectedFilename = getElement('.files-table .file-item.selected .file-name').textContent,
                file = new File(state.getFileByName(selectedFilename));

            for (var prop in file) {
                if (file.hasOwnProperty(prop)) {
                    const infoItem = getElement(`.info-modal .info-item.${prop}`);
                    if (typeof infoItem !== 'undefined') {
                        var info = file[prop];
                        if (prop === 'size') {
                            info = file.bytesToSize();
                        }
                        getElement('.info-text', infoItem).textContent = info;
                    }
                }
            }
        });
    };

    var toolbarActions = function () {
        // back
        bindEvent('click', '.toolbar button[data-action="back"]', function () {
            back();
        });
    };
};

export default App;