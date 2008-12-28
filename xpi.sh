#!/bin/sh
set -e
set -x

name=itasanotifier
branch=devel

workdir=/tmp/release.tmp
repourl=git://github.com/hamen/ff-$name.git
#repourl=/home/hamen/code/itasanotifier/devel
releasedir=/home/hamen/code/itasanotifier # $name/$branch
#releasedir=/var/www/repo.hyperstruct.net/public/$name/$branch
updatepath=$releasedir/update.rdf
updateurl=http://hamen.org/$name/$branch/update.rdf
extid=$name@hamen.org


# functions and definitions

alias xmled="xmlstarlet ed -N 'rdf=http://www.w3.org/1999/02/22-rdf-syntax-ns#' -N 'em=http://www.mozilla.org/2004/em-rdf#'"

cleanup() {
    cd $workdir
    rm -rf $name
}


# retrieve repository

cd $workdir
[ -d "$name" ] && rm -rf $name
git clone --depth 1 $repourl $name
cd $name


# switch to release branch if necessary

if [ "$branch" != "devel" ]; then
    git checkout origin/$branch
fi


# set version (if any) and build number

build=`date -u +%Y%m%d%H`
if [ "$branch" = "devel" ]; then
    version=$build
else
    tag=`git tag -l | tail -1`
    if [ $tag = "" ]; then
        cleanup
        exit 1
    fi
    version=$tag.$build
fi


# remove previous package from release dir

rm -f $releasedir/$name*.xpi


# set package file names

pkgfile=$releasedir/$name-$version.xpi
pkglink=$releasedir/$name.xpi
xpiurl=http://hamen.org/$name/$branch/$name-$version.xpi
base=`pwd`


# build package

mkdir dist dist/chrome

cd $base/chrome
zip -y -r ../dist/chrome/$name.jar .

cd $base
[ -d defaults ] && cp -a defaults dist
[ -d components ] && cp -a components dist
[ -d modules ] && cp -a modules dist
[ -d platform ] && cp -a platform dist


cd $base
sed -e "s|chrome/|jar:chrome/$name.jar!/|g" chrome.manifest >dist/chrome.manifest
xmled -u '//em:version' -v $version -u '//em:updateURL' -v $updateurl install.rdf >dist/install.rdf

cd $base/dist
zip -r $pkgfile *
ln -sf $pkgfile $pkglink


# sign manifest

cd $base
/usr/local/share/spock/spock \
    -d /home/bard/secdir \
    -i urn:mozilla:extension:$extid \
    -v $version \
    -u $xpiurl \
    -f $pkgfile \
    update.rdf.template >$updatepath

cleanup
