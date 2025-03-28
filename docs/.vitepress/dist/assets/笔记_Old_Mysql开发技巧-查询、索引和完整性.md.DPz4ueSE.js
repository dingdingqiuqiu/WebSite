import{_ as i,c as a,o as n,ae as l}from"./chunks/framework.ChhGBEr5.js";const g=JSON.parse('{"title":"Mysql开发技巧-查询、索引和完整性","description":"","frontmatter":{"title":"Mysql开发技巧-查询、索引和完整性","mathjax":true,"date":"2024-11-17T19:22:02.000Z","tags":null,"categories":null},"headers":[],"relativePath":"笔记/Old/Mysql开发技巧-查询、索引和完整性.md","filePath":"笔记/Old/Mysql开发技巧-查询、索引和完整性.md","lastUpdated":1743185048000}'),h={name:"笔记/Old/Mysql开发技巧-查询、索引和完整性.md"};function p(k,s,t,e,d,E){return n(),a("div",null,s[0]||(s[0]=[l(`<p>本文基于头歌平台上实验MySql开发技巧-查询、索引和完整性。</p><h3 id="第1关-基本查询的学习" tabindex="-1">第1关：基本查询的学习 <a class="header-anchor" href="#第1关-基本查询的学习" aria-label="Permalink to &quot;第1关：基本查询的学习&quot;">​</a></h3><h4 id="遗漏的查询语句知识点" tabindex="-1">遗漏的查询语句知识点 <a class="header-anchor" href="#遗漏的查询语句知识点" aria-label="Permalink to &quot;遗漏的查询语句知识点&quot;">​</a></h4><h4 id="应用" tabindex="-1">应用 <a class="header-anchor" href="#应用" aria-label="Permalink to &quot;应用&quot;">​</a></h4><p>在右侧代码窗口区域的指定位置编写查询语句，实现对数据库YGGL(包括表emp、dept和sal)的相关查询：</p><p>查询一：使用子查询的方法，查找财务部cwb年龄不低于所有研发部yfb雇员年龄的雇员姓名ename、编号eid和性别sex。</p><p>查询二：使用连接查询的方式，查找财务部cwb收入income在5200元以上的雇员姓名ename及其薪水收入income支出outcome情况。</p><div class="language-sql vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">sql</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面补齐查询一的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ename,eid,sex </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    where</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> did </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">in</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    (</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> did </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dept</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        where</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dname</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;cwb&#39;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    )</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    and</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    birth</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">&lt;=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">all</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        (</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> birth </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">            where</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> did </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">in</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">                (</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> did </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dept</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">                    where</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dname</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;yfb&#39;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">                )</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        );</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入查询二的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ename,income,outcome</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp,sal,dept</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    where</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> emp</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">eid</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">sal</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">eid</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> and</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">        emp</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">did</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">dept</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">did</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> and</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        dname</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;cwb&#39;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> and</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> income</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">&gt;</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">5200</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span></code></pre></div><h3 id="第2关-深入学习查询语句" tabindex="-1">第2关：深入学习查询语句 <a class="header-anchor" href="#第2关-深入学习查询语句" aria-label="Permalink to &quot;第2关：深入学习查询语句&quot;">​</a></h3><h4 id="应用-1" tabindex="-1">应用 <a class="header-anchor" href="#应用-1" aria-label="Permalink to &quot;应用&quot;">​</a></h4><p>在右侧代码窗口区域的指定位置编写查询语句，实现对数据库YGGL(包括表emp、dept和sal)的相关查询： 查询一：求财务部雇员的总人数； 查询二：求各部门的雇员数； 查询三：将各雇员的姓名按收入由低到高排列（提示：使用连接查询）。</p><div class="language-sql vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">sql</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入查询一的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> count</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(eid)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    where</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> did</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        (</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> did</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">            from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dept</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">                where</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dname</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;cwb&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入查询二的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> count</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(eid)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    group by</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> did;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">   </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入查询三的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> emp</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">ename</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp,sal</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    where</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> emp</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">eid</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">sal</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">eid</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    order by</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> income;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span></code></pre></div><h3 id="第3关-视图的创建和使用" tabindex="-1">第3关：视图的创建和使用 <a class="header-anchor" href="#第3关-视图的创建和使用" aria-label="Permalink to &quot;第3关：视图的创建和使用&quot;">​</a></h3><h4 id="应用-2" tabindex="-1">应用 <a class="header-anchor" href="#应用-2" aria-label="Permalink to &quot;应用&quot;">​</a></h4><p>请你思考，我们想限制各部门的经理只能查找本部雇员的薪水情况该怎么操作呢？比如财务部，只让财务部的经理查看本部门雇员姓名和收入、支出情况。</p><p>请你创建cx_sal视图并使用该视图查看财务部雇员薪水情况ename、income和outcome。</p><div class="language-sql vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">sql</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入创建cx_sal的视图的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">create or replace</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> view</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> cx_sal</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">as</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    select</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ename,income,outcome</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp,sal,dept</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        where</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> emp</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">eid</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">sal</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">eid</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> and</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">            emp</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">did</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">dept</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">did</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> and</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            dname</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;cwb&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入查询财务部雇员薪水情况视图的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">select</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> cx_sal;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span></code></pre></div><h3 id="第4关-索引与完整性" tabindex="-1">第4关：索引与完整性 <a class="header-anchor" href="#第4关-索引与完整性" aria-label="Permalink to &quot;第4关：索引与完整性&quot;">​</a></h3><h4 id="应用-3" tabindex="-1">应用 <a class="header-anchor" href="#应用-3" aria-label="Permalink to &quot;应用&quot;">​</a></h4><p>同样的，你需要在我们已经创建好整个YGGL数据库的基础上进行以下操作：</p><p>建立索引pk_xs_bak：对emp的eid建立索引； 实现域完整性ch_tel：为emp的tel建立check约束，其值只能为0-9的数字； 实现实体完整性un_dept：为dept的dname创建唯一性索引； 实现参照完整性fk_emp：将emp中的did列为外键。</p><div class="language-sql vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">sql</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入创建索引的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">create</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> index</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> pk_xs_bak</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">on</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp(eid);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入实现域完整性的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">alter</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> table</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    add</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">constraint</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ch_tel </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">check</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(tel </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">between</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> and</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 9</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">));</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入实现实体完整性的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">alter</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> table</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dept</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">add</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> constraint</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> un_dept </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">unique</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(dname);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">//</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请在下面输入实现参照完整性的MySQL语句</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********begin*********/</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">alter</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> table</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> emp</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    add</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> constraint</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> sal_id </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">foreign key</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(eid)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        references</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> sal(eid);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*********end*********/</span></span></code></pre></div>`,22)]))}const y=i(h,[["render",p]]);export{g as __pageData,y as default};
