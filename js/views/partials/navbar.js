$('.navbar-content').html(
    _.div({class: 'navbar navbar-default'},
        _.div({class: 'container'}, [
            _.ul({class: 'nav navbar-nav'}, [
                _.li(
                    _.a({href: '/repos/'}, [
                        _.span({class: 'glyphicon glyphicon-arrow-left'}),
                        ' Repos'
                    ])
                ),
                _.li(
                    _.a({href: '/repos/' + req.params.user + '/' + req.params.repo + '/deployment/'}, [
                        _.span({class: 'glyphicon glyphicon-user'}),
                        ' Deployment'
                    ])
                ),
                _.li(
                    _.a({href: '/repos/' + req.params.repo + '/contributors/'}, [
                        _.span({class: 'glyphicon glyphicon-user'}),
                        ' Contributors'
                    ])
                ),
                _.li(
                    _.a({href: '/repos/' + req.params.repo + '/issues/'}, [
                        _.span({class: 'glyphicon glyphicon-th-list'}),
                        ' Issues'
                    ])
                ),
                _.li(
                    _.a({href: '/repos/' + req.params.repo + '/settings/'}, [
                        _.span({class: 'glyphicon glyphicon-cog'}),
                        ' Settings'
                    ])
                )
            ]),
            _.ul({class: 'nav navbar-nav navbar-right'},
                _.li({class: 'navbar-btn'},
                    _.div({class: 'input-group'}, [
                        _.span({class: 'input-group-addon'},
                            'git'
                        ),
                        function() {
                            var element = _.input({class: 'form-control', type: 'text', value: ''});

                            api.repo(req.params.user, req.params.repo, function(repo) {
                                element.attr('value', repo.cloneUrl); 
                            });

                            return element;
                        }
                    ])
                )
            )
        ])
    )
);

// Set active navigation button
$('.navbar-content .navbar-nav li').each(function(i) {
    var a = $(this).children('a');
    var isActive = location.pathname == a.attr('href') || location.pathname + '/' == a.attr('href');

    $(this).toggleClass('active', isActive);
});
