'use strict';

// Helpers
let ContentHelperCommon = require('../../common/helpers/ContentHelper');

// Models
let Content = require('../../common/models/Content');
let User = require('../models/User');

class ContentHelper extends ContentHelperCommon {
    /**
     * Gets all Content objects
     *
     * @param {String} project
     * @param {String} environment
     *
     * @return {Promise} promise
     */
    static getAllContents(
        project = requiredParam('project'),
        environment = requiredParam('environment')
    ) {
        let collection = environment + '.content';

        return MongoHelper.find(
            project,
            collection,
            {},
            {},
            {
                sort: 1
            }
        ).then((results) => {
            let contentList = [];

            for(let i in results) {
                let content = new Content(results[i]);

                // Make sure runaway publish dates are not included
                content.publishOn = null;
                content.unpublishOn = null;
                
                contentList[contentList.length] = content;

            }

            contentList.sort((a, b) => {
                return a.sort > b.sort;
            });

            return SyncHelper.mergeResource(project, environment, 'content', contentList);
        });
    }

    /**
     * Gets a Content object by id
     *
     * @param {String} project
     * @param {String} environment
     * @param {String} id
     * @param {Boolean} localOnly
     *
     * @return {Promise} promise
     */
    static getContentById(
        project = requiredParam('project'),
        environment = requiredParam('environment'),
        id = requiredParam('id'),
        localOnly = false
    ) {
        let collection = environment + '.content';
        let content;

        return MongoHelper.findOne(
            project,
            collection,
            {
                id: id
            }
        ).then((result) => {
            if(!result) {
                if(localOnly) {
                    return Promise.reject(new Error('Content by id "' + id + '" was not found'));
                }

                return SyncHelper.getResourceItem(project, environment, 'content', id);
            }
            
            return Promise.resolve(result);

        }).then((result) => {
            if(!result) {
                return Promise.reject(new Error('Content by id "' + id + '" was not found'));
            }

            content = new Content(result);

            // Make sure runaway publish dates are not included
            content.publishOn = null;
            content.unpublishOn = null;

            return ScheduleHelper.getTasks(null, content.id);
        })
        .then((tasks) => {
            content.adoptTasks(tasks);

            return Promise.resolve(content);
        });
    }
    
    /**
     * Sets a Content object by id
     *
     * @param {String} project
     * @param {String} environment
     * @param {String} id
     * @param {Content} content
     * @param {User} user
     * @param {Boolean} create
     *
     * @return {Promise} Promise
     */
    static setContentById(
        project = requiredParam('project'),
        environment = requiredParam('environment'),
        id = requiredParam('id'),
        content = requiredParam('content'),
        user = requiredParam('user'),
        create = false
    ) {
        debug.log('Updating content "' + id + '"...', this);
        
        let updateContent = () => {
            // Handle scheduled publish task
            let handlePublishTask = () => {
                if(content.publishOn) {
                    return ScheduleHelper.updateTask(project, environment, 'publish', id, content.publishOn, user);
                } else {
                    return ScheduleHelper.removeTask(project, environment, 'publish', id);
                }
            };

            // Handle scheduled unpublish task
            let handleUnpublishTask = () => {
                if(content.unpublishOn) {
                    return ScheduleHelper.updateTask(project, environment, 'unpublish', id, content.unpublishOn, user);
                } else {
                    return ScheduleHelper.removeTask(project, environment, 'unpublish', id);
                }
            };

            // Unset automatic flags
            content.locked = false;
            content.remote = false;

            // Content update data
            content.updatedBy = user.id;
            content.updateDate = Date.now();
            
            // Fallback in case of no "created by" user
            if(!content.createdBy) {
                content.createdBy = content.updatedBy;
            }
            
            let collection = environment + '.content';

            return handlePublishTask()
            .then(handleUnpublishTask())
            .then(() => {
                return MongoHelper.updateOne(
                    project,
                    collection,
                    { id: id },
                    content,
                    { upsert: create } // Whether or not to create the node if it doesn't already exist
                );
            })
            .then(() => {
                debug.log('Done updating content "' + id + '"', this);
            });
        };

        // Check for empty Content object
        if(!content || Object.keys(content).length < 1) {
            return Promise.reject(new Error('Posted content with id "' + id + '" is empty'));
        }

        // Check for self parent
        if(content.parentId == content.id) {
            return Promise.reject(new Error('Content "' + content.id + '" cannot be a child of itself'));
        }

        // Check for allowed Schemas
        if(content.parentId) {
            return this.isSchemaAllowedAsChild(project, environment, content.parentId, content.schemaId)
            .then(updateContent);
        }

        return updateContent();
    }

    /**
     * Creates a new content object
     *
     * @param {String} project
     * @param {String} environment
     * @param {String} schemaId
     * @param {String} parentId
     * @param {User} user
     * @param {Object} properties
     *
     * @return {Promise} New Content object
     */
    static createContent(
        project = requiredParam('project'),
        environment = requiredParam('environment'),
        schemaId = requiredParam('schemaId'),
        parentId = null,
        user = requiredParam('user'),
        properties = null
    ) {
        return this.isSchemaAllowedAsChild(project, environment, parentId, schemaId)
        .then(() => {
            return SchemaHelper.getSchemaById(project, environment, schemaId);
        })
        .then((schema) => {
            let content = Content.create(schema.id, properties);
            let collection = environment + '.content';

            debug.log('Creating content "' + content.id + '"...', this);

            content.createdBy = user.id;
            content.updatedBy = content.createdBy;

            if(parentId) {
                content.parentId = parentId;
            }

            return MongoHelper.insertOne(
                project,
                collection,
                content.getFields()
            )
            .then(() => {
                debug.log('Content "' + content.id + '" created and inserted into "' + project + '.' + collection + '"', this);

                return Promise.resolve(content);
            });
        });
    }
    
    /**
     * Removes a content object
     *
     * @param {String} project
     * @param {String} environment
     * @param {String} id
     * @param {Boolean} removeChildren
     *
     * @return {Promise} promise
     */
    static removeContentById(
        project = requiredParam('project'),
        environment = requiredParam('environment'),
        id = requiredParam('id'),
        removeChildren = false
    ) {
        let collection = environment + '.content';
        
        return new Promise((resolve, reject) => {
            MongoHelper.removeOne(
                project,
                collection,
                {
                    id: id
                }
            )
            .then(() => {
                if(removeChildren) {
                    MongoHelper.remove(
                        project,
                        collection,
                        {
                            parentId: id
                        }
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch(reject);
                
                } else {
                    MongoHelper.update(
                        project,
                        collection,
                        {
                            parentId: id
                        },
                        {
                            parentId: null
                        }
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch(reject);

                }
            })
            .catch(reject);
        });
    }
}

module.exports = ContentHelper;
