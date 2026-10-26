// 友情链接数据配置
// ⚠️ 此文件由 GitHub Actions 自动生成，请勿手动修改
// 数据来源：https://github.com/StarGazer114/Shirone-content/issues
// 提交友链：新建 Issue（无需标签），合并进本文件后自动部署

export interface FriendItem {
	id: number;
	title: string;
	imgurl: string;
	desc: string;
	siteurl: string;
	tags: string[];
}

// 友情链接数据
export const friendsData: FriendItem[] = [
	{
		id: 1,
		title: "里世界",
		imgurl: "https://leenet.xyz/avatar.png",
		desc: "Welcome To The World Of Lee",
		siteurl: "https://leenet.xyz",
		tags: ["朋友们"],
	},
	{
		id: 2,
		title: "Watermelonabc的Blog",
		imgurl: "https://blog.watermelonabc.top/assets/icon/Avatar.webp",
		desc: "IDA，嘿嘿，IDA 🤤",
		siteurl: "https://watermelonabc.top/",
		tags: ["朋友们"],
	},
	{
		id: 3,
		title: "雪萌天文台",
		imgurl: "https://img.snowy.moe/head.png",
		desc: "发现巷子里的那颗星星",
		siteurl: "https://blog.snowy.moe/",
		tags: ["朋友们"],
	},
	{
		id: 4,
		title: "审核测试站点",
		imgurl: "https://example.org/a.png",
		desc: "审核流程验证",
		siteurl: "https://example.org",
		tags: [],
	},
];

// 获取所有友情链接数据
export function getFriendsList(): FriendItem[] {
	return friendsData;
}

// 获取随机排序的友情链接数据
export function getShuffledFriendsList(): FriendItem[] {
	const shuffled = [...friendsData];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
