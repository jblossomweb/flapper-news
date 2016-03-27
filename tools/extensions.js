var Module = {}

Module.getFileExtension = function getFileExtension(string) {
    var filename = string.split('/').pop()
    var ext = filename.split('.').pop()
    if(ext === filename) {
      return false
    }
    ext = ext.split('?')[0]
    return ext.toLowerCase()
}

Module.isJpeg = function isJpeg(string) {
    return Module.getFileExtension(string) === 'jpg' || Module.getFileExtension(string) === 'jpeg' || Module.getFileExtension(string) === 'img'
}

Module.isPng = function isPng(string) {
    return Module.getFileExtension(string) === 'png' || Module.getFileExtension(string) === 'apng'
}

Module.isGif = function isGif(string) {
    return Module.getFileExtension(string) === 'gif'
}

Module.isWebp = function isWebp(string) {
    return Module.getFileExtension(string) === 'webp'
}

Module.isSvg = function isSvg(string) {
    return Module.getFileExtension(string) === 'svg'
}

Module.isTiff = function isTiff(string) {
    return Module.getFileExtension(string) === 'tif' || Module.getFileExtension(string) === 'tiff'
}

Module.isIco = function isIco(string) {
    return Module.getFileExtension(string) === 'ico'
}

Module.isImage = function isImage(string) {
    switch(true) {
      case Module.isJpeg(string): return true
      case Module.isPng(string): return true
      case Module.isGif(string): return true
      case Module.isWebp(string): return true
      case Module.isSvg(string): return true
      case Module.isTiff(string): return true
      default: return false
    }
}

Module.getMimeType = function getMimeType(ext) {
  switch(ext) {
      case 'ico':
        return 'image/x-icon'
      case 'jpg':
      case 'jpeg':
      case 'img':
        return 'image/jpeg'
      case 'gif':
        return 'image/gif'
      break;
      case 'png':
      case 'apng':
        return 'image/png'
      break;
      case 'webp':
        return 'image/webp'
      break;
      case 'svg':
        return 'image/svg+xml'
      break;
      case 'tif':
      case 'tiff':
        return 'image/svg+xml'
      break;
      case 'txt':
        return 'text/plain'
      break;
      default:
        return 'application/octet-stream'
    }
}

// export module
module.exports = Module