import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const webSearchTool = createTool({
  id: "web-search",
  description: "Search the internet for information or fetch content from a URL. Use this to research topics, find current data, trends, facts, or read full articles.",
  inputSchema: z.object({
    query: z.string().optional().describe("Search query to look up on the web"),
    maxResults: z.number().default(5).describe("Maximum number of search results to return (1-10)"),
    fetchUrl: z.string().url().optional().describe("URL to fetch and read the full content from (alternative to search)"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
        score: z.number(),
      }),
    ).describe("Search results from the web"),
    fetchedContent: z.string().optional().describe("Full page content from the fetched URL"),
  }),
  execute: async (ctx) => {
    const { query, maxResults, fetchUrl } = ctx.context;

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    if (fetchUrl) {
      const response = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ urls: [fetchUrl] }),
      });

      if (!response.ok) {
        throw new Error(`Tavily extract failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { results: Array<{ url: string; content: string; rawContent: string }> };
      const extracted = data.results?.[0];

      return {
        results: [],
        fetchedContent: extracted?.content ?? extracted?.rawContent ?? "No content could be extracted from the URL",
      };
    }

    if (!query) {
      throw new Error("Either query or fetchUrl must be provided");
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        max_results: Math.min(maxResults, 10),
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      answer?: string;
      results: Array<{ title: string; url: string; content: string; score: number }>;
    };

    const results = data.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    }));

    if (data.answer) {
      results.unshift({
        title: "Summary",
        url: "",
        content: data.answer,
        score: 1,
      });
    }

    return { results };
  },
});