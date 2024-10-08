import $ from 'jquery';
import mime from 'mime';
import parse from 'srcset-parse';

export function isHttpLink(link: string) {
  // 正则表达式检查链接是否以 http:// 或 https:// 开头
  const httpRegex = /^(http|https):\/\//;
  return httpRegex.test(link);
}

/**
 * 获取base64图片的格式
 * @param base64Data
 */
export function getBase64ImageFormat(base64Data: string) {
  // 解析 base64 编码的数据，提取图像数据部分
  const base64Parts = base64Data.split(';base64,');
  const imageType = base64Parts[0].split(':')[1];
  const imageData = Buffer.from(base64Parts[1], 'base64');

  // 图像格式检测字典，存储不同格式的标识和对应的格式名
  const imageFormats = {
    '89504E47': 'PNG',
    '47494638': 'GIF',
    FFD8FFDB: 'JPEG',
    FFD8FFE0: 'JPEG',
    FFD8FFE1: 'JPEG',
  };

  // 获取数据的前几个字节
  const firstBytes = imageData.toString('hex', 0, 4).toUpperCase();

  // 检查前几个字节是否匹配已知的图像格式标识
  for (const signature in imageFormats) {
    if (firstBytes.startsWith(signature)) {
      // @ts-ignore
      return imageFormats[signature];
    }
  }

  // 如果无法识别，则返回未知格式
  return 'UNKNOWN';
}

/**
 * 获取url的扩展名
 * @param url
 */
export function getUrlExtension(url: string) {
  const u = new URL(url);
  const filename = u.pathname.substring(u.pathname.lastIndexOf('/') + 1);
  const extension = filename.substring(filename.lastIndexOf('.') + 1);
  return extension.toUpperCase();
}

/**
 * 获取picture元素中最大的图片
 * @param element
 */
export function getPictureMaxSource(element: HTMLPictureElement) {
  const $sources = $(element).find('source');

  const sortBy = {
    'image/gif': 1,
    'image/png': 2,
    'image/jpeg': 3,
    'image/jpg': 3,
    '': 4,
    undefined: 4,
  };

  if ($sources.length > 0) {
    return (
      $sources
        .filter((index, source) => source.media === '' || source.media === null)
        .toArray()
        // @ts-ignore
        .sort((a, b) => sortBy[a.type] - sortBy[b.type])
        .map((elem) => getImageDescBySize(elem.srcset))
    );
  }

  const $img = $(element).find('img');
  return $img
    .toArray()
    .filter((img) => img.dataset['srcset'] || img.srcset)
    .map((elem) => getImageDescBySize(elem.dataset['srcset'] || elem.srcset));
}

/**
 * 根据图片信息获取图片列表大小降序排列
 * @param srcset
 */
export function getImageDescBySize(srcset: string) {
  const candidate = parse(srcset);
  return candidate
    .sort((a, b) => {
      if (a.width && b.width) {
        return b.width - a.width;
      }

      if (a.density && b.density) {
        return b.density - a.density;
      }

      return -1;
    })
    .map((elem) => {
      if (
        elem.density ||
        (elem.density === undefined && elem.width === undefined)
      ) {
        const regex = /w_(\d+)/;
        const match = elem.url.match(regex);
        if (match) {
          elem.width = Number(match[1]);
          return elem;
        }
      }
      return elem;
    }) as {
    url: string;
    width: number;
    density?: number;
  }[];
}

export function getFullUrl(url: string) {
  if (isHttpLink(url)) {
    return url;
  }

  if (url.startsWith('//')) {
    return window.location.protocol + url;
  }

  return window.location.origin + url;
}

export async function toDataURL(
  url: string,
  timeout = 2000,
): Promise<string | undefined> {
  const r = new AbortController();
  const a = setTimeout(() => r.abort(), timeout);
  try {
    const t = await (
      await fetch(url, {
        signal: r.signal,
      })
    ).blob();
    const n = new FileReader();
    n.readAsDataURL(t);
    return new Promise((r, e) => {
      n.onerror = e;
      n.onloadend = () => {
        const e = n.result;
        if (typeof e === 'string' && e.startsWith('data:image')) {
          r(e);
        } else if (e instanceof ArrayBuffer) {
          console.log(e);
        }
      };
    });
  } catch (e) {
    return undefined;
  } finally {
    clearTimeout(a);
  }
}

export function getBase64Ext(base64: string) {
  const base64Parts = base64.split(';base64,');
  const imageType = base64Parts[0].split(':')[1];
  return mime.getExtension(imageType) || undefined;
}

export function uuid(prefix = 'beaver') {
  const timestamp = new Date().getTime(); // 获取当前时间的时间戳
  const randomPart = Math.random().toString(36).substring(2, 15); // 生成一个随机字符串
  return `${prefix}_${timestamp}_${randomPart}`; // 组合成一个唯一ID
}

export function getSrcSet(dom: HTMLImageElement) {
  let srcText;
  if (dom.dataset['srcset'] || dom.srcset) {
    const imageDescBySize = getImageDescBySize(
      dom.dataset['srcset'] || dom.srcset,
    );
    if (imageDescBySize.length > 0) {
      const [{ url }] = imageDescBySize;
      srcText = url;
    }
  }

  return srcText;
}
